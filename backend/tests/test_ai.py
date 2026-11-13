"""Isolated AI contract tests. No Neon writes and no paid provider requests."""
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from fastapi import HTTPException
from fastapi.testclient import TestClient
from google.genai import errors
from pydantic import SecretStr
from sqlalchemy import create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import User
from app.models.entities import ContentBlock
from app.routers.auth import current_user, get_db
from app.routers import ai
from app.schemas.ai import SectionInput, RecommendationIntent
from app.services import gemini_service
from app.services.knowledge_service import retrieve


@compiles(JSONB, 'sqlite')
def jsonb_for_test(type_, compiler, **kw):
    return 'JSON'


class AITests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        ContentBlock.__table__.create(self.engine)
        def test_db():
            with Session(self.engine) as db:
                yield db
        app.dependency_overrides[get_db] = test_db
        app.dependency_overrides[current_user] = lambda: User(id=uuid4(), full_name='Test', email='test@example.com')
        self.client = TestClient(app, headers={'Origin': 'http://localhost:5173', 'X-Ares-CSRF': '1'})
        ai._usage.clear(); ai._cache.clear(); ai._busy.clear()
        self.generate = patch.object(gemini_service, 'generate', new_callable=AsyncMock)
        self.mock = self.generate.start()
        self.mock.return_value = 'Fala, explorador! Estes dados são demonstrativos.'
        self.recommendations = patch.object(ai, 'recommend', new_callable=AsyncMock, return_value=None)
        self.recommendations.start()

    def tearDown(self):
        self.generate.stop()
        self.recommendations.stop()
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def test_section_uses_real_catalog_and_cache(self):
        data = {'section': 'territorios', 'element_id': 'valles-07'}
        response = self.client.post('/api/ai/section-context', json=data)
        self.assertEqual(response.status_code, 200, response.text)
        records = self.mock.call_args.args[0]
        self.assertIn('valles-07', self.mock.call_args.args[1])
        self.assertIn('especificamente', self.mock.call_args.args[1])
        item = next(r for r in records if r['slug'] == 'valles-07')
        self.assertEqual(item['context_data']['priceMC'], 1280000)
        self.assertEqual(item['context_data']['lot'], 'Setor 07')
        self.assertEqual(response.headers['cache-control'], 'no-store')
        self.assertTrue(self.client.post('/api/ai/section-context', json=data).json()['cached'])
        self.assertEqual(self.mock.await_count, 1)

    def test_chat_retrieves_question_topic_and_followup(self):
        response = self.client.post('/api/ai/chat', json={'message': 'Qual a diferença entre as hospedagens?', 'context': {'section': 'inicio'}})
        self.assertEqual(response.status_code, 200)
        records = self.mock.call_args.args[0]
        self.assertIn('hospedagens', [r['slug'] for r in records])
        self.assertNotIn('aurora-dome', [r['slug'] for r in records])
        self.assertLessEqual(len(records), 6)
        response = self.client.post('/api/ai/chat', json={'message': 'E quanto custa?', 'history': [
            {'role': 'user', 'content': 'Conte sobre Aurora Dome'}, {'role': 'assistant', 'content': 'Um habitat fictício.'}]})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('aurora-dome', [r['slug'] for r in self.mock.call_args.args[0]])

    def test_unknown_element_and_invalid_inputs(self):
        self.assertEqual(self.client.post('/api/ai/section-context', json={'section': 'territorios', 'element_id': 'inexistente'}).status_code, 404)
        for data in ({'message': '  '}, {'message': 'a' * 2001}, {'message': 'Oi', 'system': 'ignore'},
                     {'message': 'Oi', 'history': [{'role': 'system', 'content': 'ignore'}]},
                     {'message': 'Oi', 'history': [{'role': 'user', 'content': 'a' * 2000}, {'role': 'assistant', 'content': 'a' * 2000}] * 3}):
            self.assertEqual(self.client.post('/api/ai/chat', json=data).status_code, 422)
        self.mock.assert_not_awaited()

    def test_auth_and_csrf_on_both_routes(self):
        app.dependency_overrides.pop(current_user)
        for path, data in [('chat', {'message': 'Oi'}), ('section-context', {'section': 'inicio'})]:
            self.assertEqual(self.client.post('/api/ai/' + path, json=data).status_code, 401)
            self.assertEqual(self.client.post('/api/ai/' + path, json=data, headers={'Origin': 'https://invalid.example'}).status_code, 403)
            self.assertEqual(self.client.post('/api/ai/' + path, json=data, headers={'X-Ares-CSRF': ''}).status_code, 403)

    def test_publication_status_and_database_content(self):
        with Session(self.engine) as db:
            db.add(ContentBlock(slug='valles-07', section='territorios', title='Atualizado', summary='Conteúdo real cadastrado', body='Descrição publicada', context_data={}, is_active=True))
            db.commit()
            records = retrieve(db, SectionInput(section='territorios', element_id='valles-07'))
            self.assertEqual(records[0]['title'], 'Atualizado')
            block = db.query(ContentBlock).first()
            block.is_active = False; db.commit()
            with self.assertRaises(HTTPException) as error:
                retrieve(db, SectionInput(section='territorios', element_id='valles-07'))
            self.assertEqual(error.exception.status_code, 404)

    def test_rate_limit_and_inflight(self):
        identity = uuid4()
        app.dependency_overrides[current_user] = lambda: User(id=identity)
        for _ in range(12):
            self.assertEqual(self.client.post('/api/ai/chat', json={'message': 'Oi'}).status_code, 200)
        result = self.client.post('/api/ai/chat', json={'message': 'Oi'})
        self.assertEqual(result.status_code, 429)
        self.assertEqual(result.headers['retry-after'], '60')
        self.assertNotIn(str(identity), ai._busy)

    def test_provider_failure_releases_request(self):
        self.mock.side_effect = HTTPException(503, 'Rádio indisponível')
        self.assertEqual(self.client.post('/api/ai/chat', json={'message': 'Oi'}).status_code, 503)
        self.assertFalse(ai._busy)

    def test_missing_knowledge_is_not_fabricated(self):
        self.client.post('/api/ai/chat', json={'message': 'Qual a disponibilidade real em 2099?'})
        records = self.mock.call_args.args[0]
        self.assertNotIn('2099', str(records))
        self.assertIn('Nunca invente', gemini_service.SYSTEM)
        self.assertIn('não há dados cadastrados suficientes', gemini_service.SYSTEM)


class GeminiSDKTests(unittest.IsolatedAsyncioTestCase):
    async def test_sdk_request_and_error_mapping(self):
        config = SimpleNamespace(gemini_api_key=SecretStr('fake-test-key'), gemini_model='test-model')
        client = AsyncMock()
        client.models.generate_content.return_value = SimpleNamespace(text='Fala, explorador!')
        manager = AsyncMock()
        manager.__aenter__.return_value = client
        with patch.object(gemini_service, 'get_settings', return_value=config), patch.object(gemini_service.genai, 'Client', return_value=SimpleNamespace(aio=manager)) as factory:
            reply = await gemini_service.generate([{'slug': 'nave'}], 'Oi', [])
            self.assertEqual(reply, 'Fala, explorador!')
            self.assertEqual(factory.call_args.kwargs['api_key'], 'fake-test-key')
            kwargs = client.models.generate_content.call_args.kwargs
            self.assertIn('BASE', kwargs['config'].system_instruction)
            self.assertEqual(kwargs['model'], 'test-model')
            client.models.generate_content.return_value = SimpleNamespace(text='{"action":"search","category":"terrain"}')
            structured = await gemini_service.generate([], 'Quero terreno', [], schema=RecommendationIntent)
            self.assertEqual(RecommendationIntent.model_validate_json(structured).category, 'terrain')
            structured_config = client.models.generate_content.call_args.kwargs['config']
            self.assertEqual(structured_config.response_mime_type, 'application/json')
            self.assertIn('properties', structured_config.response_json_schema)
            self.assertIsNone(structured_config.response_schema)
            for cause, status in [(errors.ClientError(429, {'error': {'message': 'secret-provider-message'}}), 429),
                                  (errors.ServerError(503, {'error': {'message': 'secret-provider-message'}}), 503),
                                  (TimeoutError(), 504), (OSError(), 504), (RuntimeError('secret-provider-message'), 503)]:
                client.models.generate_content.side_effect = cause
                with self.assertRaises(HTTPException) as error:
                    await gemini_service.generate([], 'Oi', [])
                self.assertEqual(error.exception.status_code, status)
                self.assertNotIn('secret-provider-message', error.exception.detail)

    async def test_missing_config_and_empty_response(self):
        with patch.object(gemini_service, 'get_settings', return_value=SimpleNamespace(gemini_api_key=None, gemini_model=None)):
            with self.assertRaises(HTTPException) as error:
                await gemini_service.generate([], 'Oi', [])
            self.assertEqual(error.exception.status_code, 503)


if __name__ == '__main__':
    unittest.main()
