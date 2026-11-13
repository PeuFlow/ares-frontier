"""Explicit, additive import of the site's published demo catalog into catalog_items."""
import json
from decimal import Decimal
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select

from app.models.entities import CatalogItem

CATALOG_PATH = Path(__file__).resolve().parents[1] / 'data/catalog.json'
CATEGORIES = {'territorios': 'terrain', 'viagens': 'trip',
              'hospedagens': 'accommodation', 'experiencias': 'experience'}


class ImportItem(BaseModel):
    model_config = ConfigDict(extra='forbid')
    code: str = Field(min_length=1, max_length=40)
    item_type: str
    name: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1)
    price_credits: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    currency: str = Field(min_length=1, max_length=10)
    image_url: str | None
    attributes: dict

    @field_validator('item_type')
    @classmethod
    def valid_category(cls, value):
        if value not in CATEGORIES.values():
            raise ValueError('Categoria inválida.')
        return value


def load_catalog(path=CATALOG_PATH):
    records = json.loads(Path(path).read_text(encoding='utf-8'))
    items, codes = [], set()
    for record in records:
        category = CATEGORIES[record['section']]
        data = dict(record['context_data'])
        code = record['slug']
        if code in codes:
            raise ValueError('Código duplicado no catálogo de origem.')
        codes.add(code)
        if data['id'] != code or data.get('fictional') is not True:
            raise ValueError('Origem de catálogo inconsistente.')
        # Aliases preserve values exactly; no elevations, destinations or scenery are inferred.
        if category == 'terrain':
            data['area_km2'] = data['areaKm2']
        elif category == 'trip':
            data['duration_days'] = data['days']
        elif category == 'accommodation':
            data['accommodation_type'] = data['kind']
            data['price_unit'] = 'night'
        else:
            data['duration_hours'] = data['hours']
        data['frontend_id'] = code
        data['catalog_source'] = 'frontend-demo-v1'
        item = ImportItem(code=code, item_type=category, name=record['title'],
                          description=record['summary'],
                          price_credits=Decimal(str(data['nightMC'] if category == 'accommodation' else data['priceMC'])),
                          currency=data['currency'], image_url=data.get('image'), attributes=data)
        items.append(item)
    return items


def import_catalog(db, items, *, apply=False):
    """Never overwrite existing prices, availability, attributes or identifiers."""
    existing = set(db.scalars(select(CatalogItem.code)).all())
    missing = [item for item in items if item.code not in existing]
    counts = {category: sum(item.item_type == category for item in missing) for category in CATEGORIES.values()}
    if apply:
        for item in missing:
            db.add(CatalogItem(id=uuid5(NAMESPACE_URL, 'ares-frontier:catalog:' + item.code),
                               **item.model_dump(), available=True))
        db.commit()
    return {'inserted' if apply else 'pending': len(missing), 'preserved': len(items) - len(missing), 'categories': counts}
