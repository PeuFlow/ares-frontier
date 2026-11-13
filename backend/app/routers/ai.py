import hashlib
import json
from collections import OrderedDict, deque
from threading import Lock
from time import monotonic
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from starlette.concurrency import run_in_threadpool

from app.models import User
from app.core.config import get_settings
from app.routers.auth import DB, current_user, require_csrf
from app.schemas.ai import AIOutput, ChatInput, SectionInput, Source, Recommendation
from app.services import gemini_service
from app.services.knowledge_service import retrieve
from app.services.recommendation_service import recommend, detail

router = APIRouter(prefix='/api/ai', tags=['ai'])
UserDep = Annotated[User, Depends(current_user)]
_lock = Lock()
_usage: OrderedDict[str, deque] = OrderedDict()
_cache: OrderedDict[str, tuple[float, str]] = OrderedDict()
_busy: set[str] = set()


def admit(user_id):
    key, now = str(user_id), monotonic()
    with _lock:
        for expired in [k for k, q in _usage.items() if not q or now - q[-1] >= 60]:
            _usage.pop(expired, None)
        q = _usage.setdefault(key, deque())
        while q and now - q[0] >= 60:
            q.popleft()
        if len(q) >= 12 or key in _busy or len(_busy) >= 8 or len(_usage) > 5000:
            raise HTTPException(429, 'Aguarde um pouco antes de chamar o astronauta novamente.', headers={'Retry-After': '60'})
        q.append(now)
        _busy.add(key)
    return key


async def respond(data, db, user, response, contextual):
    key = admit(user.id)
    response.headers['Cache-Control'] = 'no-store'
    try:
        if not contextual:
            recommendation = await recommend(data, db, user.id)
            if recommendation is not None:
                return recommendation
        context = data if contextual else data.context
        query = '' if contextual else data.message + ' ' + ' '.join(m.content for m in data.history[-4:] if m.role == 'user')
        records = await run_in_threadpool(retrieve, db, context, query, include_demo=contextual)
        cache_key = hashlib.sha256(json.dumps([get_settings().gemini_model, context.model_dump() if context else None, records], sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        cached = False
        message = None
        if contextual:
            with _lock:
                hit = _cache.get(cache_key)
                if hit and monotonic() - hit[0] < 600:
                    message, cached = hit[1], True
        if message is None:
            if contextual:
                prompt = (f'Explique especificamente o elemento de slug {context.element_id}. '
                          'Comece pelo nome e use seus dados cadastrados; não faça apenas uma apresentação geral da seção.'
                          if context.element_id else f'Apresente a seção {context.section} ao explorador com uma orientação útil.')
            else:
                prompt = data.message
            message = await gemini_service.generate(records,
                prompt,
                [] if contextual else data.history, contextual=contextual,
                instruction='' if contextual else 'Explique funcionalidades gerais. Não recomende itens nesta resposta; recomendações exigem consulta validada ao catalog_items. Não trate conteúdo editorial como disponibilidade de catálogo.')
            if contextual:
                with _lock:
                    _cache[cache_key] = (monotonic(), message)
                    if len(_cache) > 256:
                        _cache.popitem(last=False)
        return AIOutput(message=message, section=context.section if context else None,
                        sources=[Source(slug=r['slug'], title=r['title']) for r in records], cached=cached,
                        recommendation_context=None if contextual else data.recommendation_context)
    finally:
        with _lock:
            _busy.discard(key)


@router.post('/section-context', response_model=AIOutput, dependencies=[Depends(require_csrf)])
async def section_context(data: SectionInput, db: DB, user: UserDep, response: Response):
    return await respond(data, db, user, response, True)


@router.post('/chat', response_model=AIOutput, dependencies=[Depends(require_csrf)])
async def chat(data: ChatInput, db: DB, user: UserDep, response: Response):
    return await respond(data, db, user, response, False)


@router.get('/catalog/{item_id}', response_model=Recommendation)
def catalog_detail(item_id: UUID, db: DB, user: UserDep, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return detail(db, item_id)
