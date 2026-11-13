"""Regression: the catalog visible on the site must be queryable by the astronaut."""
import json
import unittest
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from pydantic import SecretStr
from sqlalchemy import create_engine, select, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session

from app.models.entities import CatalogItem
from app.schemas.ai import ChatInput, RecommendationIntent
from app.services import gemini_service, recommendation_service as service
from app.services.catalog_import_service import import_catalog, load_catalog


@compiles(JSONB, 'sqlite')
def jsonb_for_test(type_, compiler, **kw):
    return 'JSON'


class CatalogImportTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://')
        CatalogItem.__table__.create(self.engine)
        self.db = Session(self.engine)
        self.items = load_catalog()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_dry_run_does_not_write_and_import_covers_all_categories(self):
        preview = import_catalog(self.db, self.items)
        self.assertEqual(preview['pending'], len(self.items))
        self.assertEqual(self.db.scalar(select(func.count()).select_from(CatalogItem)), 0)
        applied = import_catalog(self.db, self.items, apply=True)
        self.assertEqual(applied['inserted'], len(self.items))
        self.assertTrue(all(count > 0 for count in applied['categories'].values()))

    def test_second_import_preserves_uuid_prices_and_unavailability(self):
        import_catalog(self.db, self.items, apply=True)
        item = self.db.scalar(select(CatalogItem).where(CatalogItem.code == 'valles-07'))
        identity = item.id
        item.price_credits = Decimal('123.45')
        item.available = False
        item.attributes = {'edited': True}
        self.db.commit()
        result = import_catalog(self.db, self.items, apply=True)
        self.assertEqual(result['inserted'], 0)
        self.db.refresh(item)
        self.assertEqual(item.id, identity)
        self.assertEqual(item.price_credits, Decimal('123.45'))
        self.assertFalse(item.available)
        self.assertEqual(item.attributes, {'edited': True})

    def test_import_preserves_catalog_facts_and_price_units(self):
        import_catalog(self.db, self.items, apply=True)
        for source in self.items:
            item = self.db.scalar(select(CatalogItem).where(CatalogItem.code == source.code))
            self.assertEqual(item.name, source.name)
            self.assertEqual(item.price_credits, source.price_credits)
            self.assertEqual(item.description, source.description)
            self.assertEqual(item.image_url, source.image_url)
            self.assertTrue(item.attributes['fictional'])
            if item.item_type == 'accommodation':
                self.assertEqual(item.attributes['price_unit'], 'night')
                self.assertEqual(item.price_credits, item.attributes['nightMC'])
            if item.item_type == 'terrain':
                self.assertEqual(item.attributes['area_km2'], item.attributes['areaKm2'])
                self.assertNotIn('elevation_m', item.attributes)

    def test_all_categories_and_budget_work_with_the_imported_site_catalog(self):
        import_catalog(self.db, self.items, apply=True)
        for category in ['terrain', 'trip', 'accommodation', 'experience']:
            results = service.rank(self.db, RecommendationIntent(action='search', category=category, cheaper=True))
            self.assertTrue(results)
            self.assertEqual(len(results), 1)
            self.assertEqual(Decimal(results[0].price), min(item.price_credits for item in self.items if item.item_type == category))
            self.assertTrue(all(item.category == category for item in results))
            prices = [Decimal(item.price) for item in results]
            self.assertEqual(prices, sorted(prices))
        results = service.rank(self.db, RecommendationIntent(category='terrain', max_price=700000, currency='MC'))
        self.assertTrue(results)
        self.assertTrue(all(Decimal(item.price) <= 700000 for item in results))

    async def test_screenshot_questions_return_real_cards_after_import(self):
        import_catalog(self.db, self.items, apply=True)
        config = SimpleNamespace(gemini_api_key=SecretStr('test-only'))
        # This test runs synchronous ORM work on its owning thread with isolated SQLite.
        async def local_threadpool(function, *args, **kwargs):
            return function(*args, **kwargs)
        with patch.object(service, 'run_in_threadpool', side_effect=local_threadpool), patch.object(service, 'get_settings', return_value=config):
            for message, cheaper in [('Quais territórios você recomenda?', False), ('territorio barato', True)]:
                with patch.object(gemini_service, 'generate', new_callable=AsyncMock) as provider:
                    provider.side_effect = [json.dumps({'action': 'search', 'category': 'terrain', 'cheaper': cheaper}),
                        json.dumps({'message': 'Aqui estão os territórios cadastrados.', 'reasons': []})]
                    reply = await service.recommend(ChatInput(message=message), self.db, uuid4())
                    self.assertTrue(reply.recommendations, message)
                    self.assertNotIn('Não encontrei', reply.message)
                    for card in reply.recommendations:
                        self.assertIn(card.code, {item.code for item in self.items})
                    if cheaper:
                        self.assertEqual(len(reply.recommendations), 1)
                        cheapest = min(item.price_credits for item in self.items if item.item_type == 'terrain')
                        self.assertEqual(Decimal(reply.recommendations[0].price), cheapest)
                    else:
                        self.assertEqual(len(reply.recommendations), 3)


if __name__ == '__main__':
    unittest.main()
