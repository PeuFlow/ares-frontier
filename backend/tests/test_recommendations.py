"""Catalog fixtures only: no external requests, credentials or database writes."""
import json
import unittest
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import User
from app.models.entities import CatalogItem
from app.routers import ai
from app.routers.auth import current_user, get_db
from app.schemas.ai import RecommendationIntent, Criterion
from app.services import gemini_service, recommendation_service as service


@compiles(JSONB, 'sqlite')
def jsonb_for_test(type_, compiler, **kw):
    return 'JSON'


class RecommendationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        CatalogItem.__table__.create(self.engine)
        self.user = uuid4()
        def test_db():
            with Session(self.engine) as db:
                yield db
        app.dependency_overrides[get_db] = test_db
        app.dependency_overrides[current_user] = lambda: User(id=self.user)
        self.client = TestClient(app, headers={'Origin': 'http://localhost:5173', 'X-Ares-CSRF': '1'})
        self.config = patch.object(service, 'get_settings', return_value=SimpleNamespace(gemini_api_key=SecretStr('test-only')))
        self.config.start()
        self.provider = patch.object(gemini_service, 'generate', new_callable=AsyncMock)
        self.generate = self.provider.start()
        ai._usage.clear(); ai._busy.clear()

    def tearDown(self):
        self.provider.stop(); self.config.stop()
        self.client.close(); app.dependency_overrides.clear(); self.engine.dispose()

    def add(self, category='terrain', price=100, attributes=None, available=True, image=None):
        identity = uuid4()
        with Session(self.engine) as db:
            db.add(CatalogItem(id=identity, code=str(identity)[:8], item_type=category, name='Registro ' + str(price),
                description='Descrição cadastrada', price_credits=Decimal(str(price)), currency='MC',
                available=available, image_url=image, attributes=attributes or {}))
            db.commit()
        return str(identity)

    def search(self, intent, message='Quero opções', token=None):
        self.generate.side_effect = [json.dumps(intent), json.dumps({'message': 'Confira os registros consultados.', 'reasons': ['Motivo contextual.'] * 3})]
        return self.client.post('/api/ai/chat', json={'message': message, 'recommendation_context': token})

    def test_all_categories_use_only_real_records_and_routes(self):
        for category, path in service.PATHS.items():
            with self.subTest(category=category):
                identity = self.add(category, attributes={'features': ['Geologia e cânions']})
                result = self.search({'action': 'search', 'category': category, 'criteria': [
                    {'field': 'features', 'operator': 'contains', 'value': 'geological canyon', 'label': 'Geologia dos cânions'}]})
                self.assertEqual(result.status_code, 200, result.text)
                card = result.json()['recommendations'][0]
                self.assertEqual(card['id'], identity)
                self.assertEqual(card['match'], 'high')
                self.assertEqual(card['detail_path'], f'{path}?catalog_item={identity}')
                self.assertEqual(card['price'], '100.00')
                self.assertEqual(result.headers['cache-control'], 'no-store')

    def test_numeric_area_and_elevation_rank_structured_attributes(self):
        self.add(attributes={'area_km2': 10, 'elevation_m': 20})
        best = self.add(attributes={'area_km2': 500, 'elevation_m': 1500})
        result = self.search({'action': 'search', 'category': 'terrain', 'criteria': [
            {'field': 'area_km2', 'operator': 'relative_high', 'label': 'Área grande'},
            {'field': 'elevation_m', 'operator': 'gte', 'value': 1000, 'label': 'Altitude mínima', 'essential': True}]})
        self.assertEqual(result.json()['recommendations'][0]['id'], best)
        self.assertEqual(len(result.json()['recommendations']), 1)

    def test_budget_filters_and_never_converts_currency(self):
        cheap = self.add(price=99)
        self.add(price=200)
        result = self.search({'action': 'search', 'category': 'terrain', 'max_price': 100, 'currency': 'MC'}, 'Até 100 MC')
        self.assertEqual([r['id'] for r in result.json()['recommendations']], [cheap])
        self.assertEqual(self.search({'action': 'search', 'category': 'terrain', 'currency': 'USD', 'max_price': 100}, 'Até 100 USD').json()['recommendations'], [])

    def test_subjective_budget_cannot_become_an_invented_financial_cap(self):
        result = self.search({'action': 'search', 'category': 'terrain', 'max_price': 1000}, 'Quero um terreno barato')
        self.assertEqual(result.status_code, 502)
        self.assertEqual(service.explicit_amounts('até 1,5 milhão de MC'), {Decimal('1500000')})
        self.assertEqual(service.explicit_amounts('até 250 mil MC'), {Decimal('250000')})

    def test_cheap_territory_returns_only_the_cheapest_available_record(self):
        self.add(price=500)
        cheapest = self.add(price=50)
        self.add(price=250)
        self.add(price=1, available=False)
        result = self.search({'action': 'search', 'category': 'terrain', 'cheaper': True}, 'territorio barato')
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual([item['id'] for item in result.json()['recommendations']], [cheapest])
        explanation_records = self.generate.call_args.args[0]
        self.assertEqual(len(explanation_records), 1)
        self.assertEqual(explanation_records[0]['id'], cheapest)

    def test_cheap_choice_preserves_essential_requirements(self):
        self.add(price=5, attributes={'panoramic_view': False})
        cheapest_compatible = self.add(price=50, attributes={'panoramic_view': True})
        self.add(price=100, attributes={'panoramic_view': True})
        result = self.search({'action': 'search', 'category': 'terrain', 'cheaper': True, 'criteria': [
            {'field': 'panoramic_view', 'operator': 'eq', 'value': True, 'essential': True, 'label': 'Vista panorâmica'}]},
            'Quero um terreno barato, precisa ter vista panorâmica')
        self.assertEqual([item['id'] for item in result.json()['recommendations']], [cheapest_compatible])

    def test_cheap_choice_prioritizes_price_among_compatible_options(self):
        self.add(price=200, attributes={'panoramic_view': True, 'amenities': ['Conforto']})
        cheapest_compatible = self.add(price=50, attributes={'panoramic_view': True})
        intent = {'action': 'search', 'category': 'terrain', 'cheaper': True, 'criteria': [
            {'field': 'panoramic_view', 'operator': 'eq', 'value': True, 'essential': True, 'label': 'Vista panorâmica'},
            {'field': 'amenities', 'operator': 'contains', 'value': 'Conforto', 'label': 'Conforto'}]}
        result = self.search(intent, 'Quero um terreno barato com vista panorâmica obrigatória e de preferência conforto')
        self.assertEqual([item['id'] for item in result.json()['recommendations']], [cheapest_compatible])

    def test_followup_budget_and_preferences_survive_omissions(self):
        previous = RecommendationIntent(action='search', category='terrain', max_price=200, currency='MC',
            criteria=[Criterion(field='area_km2', operator='gte', value=10, label='Área mínima')])
        state = {'intent': previous.model_dump()}
        followup = service.continue_preferences(RecommendationIntent(action='search', cheaper=True), state)
        self.assertEqual(followup.category, 'terrain')
        self.assertEqual(followup.max_price, 200)
        self.assertEqual(followup.criteria, previous.criteria)
        removed = service.continue_preferences(RecommendationIntent(action='search', clear_budget=True, remove_fields=['area_km2']), state)
        self.assertIsNone(removed.max_price)
        self.assertEqual(removed.criteria, [])
        changed = service.continue_preferences(RecommendationIntent(action='search', category='trip'), state)
        self.assertEqual(changed.criteria, [])
        self.assertIsNone(changed.max_price)

    def test_empty_catalog_and_no_fabricated_fallback(self):
        result = self.search({'action': 'search', 'category': 'experience'})
        self.assertEqual(result.json()['recommendations'], [])
        self.assertIn('ainda não possui itens cadastrados', result.json()['message'])
        self.assertEqual(self.generate.await_count, 1)

    def test_essential_missing_is_never_high_and_alternatives_are_labeled(self):
        self.add(attributes={'features': ['Geologia'], 'panoramic_view': False})
        result = self.search({'action': 'search', 'category': 'terrain', 'criteria': [
            {'field': 'panoramic_view', 'operator': 'eq', 'value': True, 'essential': True, 'label': 'Vista panorâmica'},
            {'field': 'features', 'operator': 'contains', 'value': 'geologia', 'label': 'Geologia'}]})
        card = result.json()['recommendations'][0]
        self.assertEqual(card['match'], 'none')
        self.assertIn('Vista panorâmica', card['missing'])

    def test_more_economic_followup_preserves_criteria_and_excludes_previous_prices(self):
        self.add(price=200, attributes={'amenities': ['Conforto']})
        cheap = self.add(price=50, attributes={'amenities': ['Conforto']})
        self.add(price=10, attributes={'amenities': []})
        intent = RecommendationIntent(action='search', category='terrain', criteria=[Criterion(
            field='amenities', operator='contains', value='confortável', label='Conforto', essential=True)])
        expensive = self.add(price=500, attributes={'amenities': ['Conforto']})
        token = service.pack_state(self.user, intent, [expensive])
        result = self.search({'action': 'search', 'cheaper': True, 'lower_than_previous': True}, 'Tem algo mais barato?', token)
        self.assertEqual(result.json()['recommendations'][0]['id'], cheap)
        self.assertNotIn(expensive, [c['id'] for c in result.json()['recommendations']])
        state_seen = self.generate.call_args_list[-2].args[0][0]['ESTADO']
        self.assertEqual(state_seen['criteria'][0]['field'], 'amenities')

    def test_second_card_reference_reloads_current_database_values(self):
        first, second = self.add(price=10), self.add(price=20, attributes={'panoramic_view': True})
        token = service.pack_state(self.user, RecommendationIntent(action='search', category='terrain'), [first, second])
        with Session(self.engine) as db:
            item = db.get(CatalogItem, __import__('uuid').UUID(second))
            item.available = False; item.price_credits = 25; db.commit()
        result = self.search({'action': 'item', 'reference_index': 2}, 'O segundo tem vista?', token)
        card = result.json()['recommendations'][0]
        self.assertEqual(card['id'], second)
        self.assertEqual(card['price'], '25.00')
        self.assertFalse(card['available'])
        self.assertTrue(card['attributes']['panoramic_view'])
        self.assertEqual(result.json()['recommendation_context'], token)

    def test_unavailable_items_excluded_from_search(self):
        self.add(available=False)
        self.assertEqual(self.search({'action': 'search', 'category': 'terrain'}).json()['recommendations'], [])

    def test_optional_attributes_image_and_unsafe_image_are_not_fabricated(self):
        self.add(image='javascript:alert(1)')
        result = self.search({'action': 'search', 'category': 'terrain'})
        card = result.json()['recommendations'][0]
        self.assertIsNone(card['image_url'])
        self.assertEqual(card['attributes'], {})

    def test_maximum_three_recommendations(self):
        for i in range(8):
            self.add(price=i)
        self.assertEqual(len(self.search({'action': 'search', 'category': 'terrain'}).json()['recommendations']), 3)

    def test_model_cannot_supply_catalog_fields_or_arbitrary_identifiers(self):
        for field in ['id', 'price', 'available', 'image_url', 'detail_path']:
            with self.subTest(field=field):
                self.assertEqual(self.search({'action': 'search', 'category': 'terrain', field: 'fake'}).status_code, 502)

    def test_signed_context_tampering_and_cross_account_are_rejected(self):
        token = service.pack_state(self.user, RecommendationIntent(category='trip'), [])
        self.assertEqual(self.search({'action': 'search'}, token=token + 'x').status_code, 422)
        self.user = uuid4()
        self.assertEqual(self.search({'action': 'search'}, token=token).status_code, 422)
        self.generate.assert_not_awaited()

    def test_detail_endpoint_real_uuid_auth_and_not_found(self):
        identity = self.add()
        self.assertEqual(self.client.get('/api/ai/catalog/' + identity).json()['id'], identity)
        self.assertEqual(self.client.get('/api/ai/catalog/' + str(uuid4())).status_code, 404)
        self.assertEqual(self.client.get('/api/ai/catalog/not-an-id').status_code, 422)
        app.dependency_overrides.pop(current_user)
        self.assertEqual(self.client.get('/api/ai/catalog/' + identity).status_code, 401)

    def test_ambiguous_request_asks_objective_question(self):
        result = self.search({'action': 'clarify', 'question': 'Você procura uma viagem ou uma atividade?'})
        self.assertIn('viagem ou uma atividade', result.json()['message'])
        self.assertEqual(result.json()['recommendations'], [])


if __name__ == '__main__':
    unittest.main()
