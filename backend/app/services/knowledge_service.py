"""Read-only retrieval: published DB blocks + current frontend demo catalog.

No migration/seed writes, no user/profile/mission records, no conversation storage.
"""
import json
import re
import unicodedata
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import case, or_, select
from sqlalchemy.orm import Session

from app.models.entities import ContentBlock
from app.schemas.ai import SectionInput

SECTIONS = {
    'inicio': ('Bem-vindo à fronteira', 'Plataforma conceitual de exploração marciana em 2089. Explore o globo 3D, compare territórios e planeje viagens fictícias. Reservas não têm valor legal e não representam propriedade em Marte.'),
    'explorar': ('Exploração de Marte', 'Gire o globo 3D e selecione um território pelos marcadores ou pela lista. Veja relevo, exposição solar, estabilidade, recursos e riscos demonstrativos. Posições e índices do globo são fictícios.'),
    'territorios': ('Territórios de Marte', 'Busque regiões ou lotes, filtre por perfil científico, residencial ou industrial e ordene por preço ou área. Abra detalhes, salve favoritos, compare até dois terrenos e adicione um território à missão. Preços em MC são fictícios.'),
    'viagens': ('Viagens espaciais', 'Compare viagens por categoria, duração e preço. Consulte dias, capacidade e itens inclusos antes de adicionar uma viagem à missão. Todos os pacotes são demonstrativos.'),
    'hospedagens': ('Hospedagens', 'Compare habitats por tipo, capacidade, comodidades e valor por noite em MC. Escolha de 1 a 60 noites; o planejador calcula diária vezes noites. Habitats são fictícios.'),
    'experiencias': ('Experiências e atividades', 'Consulte descrição, duração em horas e preço fictício de cada atividade. Toque para adicionar à missão e novamente para remover. É possível escolher várias atividades.'),
    'missao': ('Planejamento de missão', 'Combine uma viagem, uma hospedagem, noites, experiências e um território opcional. O total soma os itens e a diária multiplicada pelas noites. Confirmar gera um protocolo AF-SIM, uma reserva demonstrativa e limpa a seleção. O planejamento fica no navegador e não é uma compra ou viagem real.'),
    'conta': ('Central de Missões', 'Consulte seu perfil, seleção atual, reservas demonstrativas, favoritos e histórico local. Login e cadastro usam a API; o planejamento demonstrativo fica neste navegador. Não tenho acesso aos dados pessoais ou reservas do explorador.'),
    'como-funciona': ('Como funciona', 'Explore o globo e o catálogo, compare no máximo dois territórios, consulte detalhes e simule uma reserva. Dados, valores e documentos do universo Ares Frontier são fictícios e sem valor legal.'),
    'nave': ('Nave do explorador', 'Converse com o astronauta sobre os catálogos e funcionalidades. A conversa é temporária, separada das explicações automáticas; Nova conversa apaga o histórico da tela. O assistente orienta, mas não modifica missões nem realiza reservas.'),
    'admin': ('Administração', 'Área restrita a administradores ativos para gerenciar exploradores. O astronauta não acessa cadastros, senhas nem registros administrativos e não executa ações nessa área.'),
}
CATALOG = json.loads((Path(__file__).resolve().parents[1] / 'data/catalog.json').read_text(encoding='utf-8'))


def normalize(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', value.lower()) if not unicodedata.combining(c))


def retrieve(db: Session, context: SectionInput | None, query: str = '', *, include_demo=True) -> list[dict]:
    section = context.section if context else 'nave'
    element = context.element_id if context else None
    base = [{'slug': key, 'section': key, 'title': title, 'summary': body, 'context_data': {'fictional': True}}
            for key, (title, body) in SECTIONS.items()] + (CATALOG if include_demo else [])
    # Only relevant sections/slugs are fetched; never dump the platform into a prompt.
    terms = set(re.findall(r'[a-z0-9-]{3,}', normalize(query))) - {'que', 'para', 'uma', 'como', 'qual', 'quais', 'por', 'com', 'tem', 'sao', 'mais'}
    aliases = {'viagens': ['viag', 'pacote', 'expedicao'], 'hospedagens': ['hosped', 'habitat', 'diaria', 'dormir'],
               'experiencias': ['experienc', 'atividad', 'rover'], 'territorios': ['territor', 'terreno', 'lote', 'regio'],
               'missao': ['missao', 'planej', 'organiz', 'reserva']}
    relevant = {section}
    for key, words in aliases.items():
        if any(word in normalize(query) for word in words):
            relevant.add(key)
    matching = {r['slug'] for r in base if any(t in normalize(r['title']) for t in terms)}
    # Known catalog slugs come first so their publication overrides cannot fall
    # beyond the bounded editorial search when a section has many blocks.
    known_slugs = {r['slug'] for r in base}
    blocks = db.scalars(select(ContentBlock).where(or_(ContentBlock.section.in_(relevant), ContentBlock.slug.in_(matching | {element or '', section})))
                        .order_by(case((ContentBlock.slug.in_(known_slugs | {element or ''}), 0), else_=1), ContentBlock.slug)
                        .limit(80)).all()
    # DB publication status is authoritative for matching slugs, including inactive blocks.
    overrides = {b.slug for b in blocks}
    records = [r for r in base if r['slug'] not in overrides]
    records += [dict(slug=b.slug, section=b.section, title=b.title, summary=b.summary[:3000], body=b.body[:6000], context_data=b.context_data)
                for b in blocks if b.is_active]
    if element:
        selected = next((r for r in records if r['slug'] == element and r['section'] in {section, 'territorios' if section == 'explorar' else section}), None)
        if selected is None:
            raise HTTPException(404, 'Não encontrei informações publicadas sobre esse elemento.')
    else:
        selected = None
    def score(record):
        title = normalize(record['title'] + ' ' + record['slug'])
        return (100 if record is selected else 0) + (20 if record['slug'] == section else 0) + (10 if record['section'] in relevant else 0) + sum(12 for t in terms if t in title)
    ranked = sorted(records, key=score, reverse=True)
    count = 6 if query else (2 if element else 1)
    result, size = [], 0
    for record in ranked:
        if score(record) <= 0 or len(result) >= count:
            continue
        # Oversized JSON from editors must not create unbounded model input.
        if len(json.dumps(record, ensure_ascii=False)) > 10000:
            record = {k: record[k] for k in ('slug', 'section', 'title', 'summary')}
        encoded = json.dumps(record, ensure_ascii=False)
        if size + len(encoded) <= 18000:
            result.append(record)
            size += len(encoded)
    return result
