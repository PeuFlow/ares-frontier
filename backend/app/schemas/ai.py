from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Section = Literal['inicio', 'explorar', 'territorios', 'viagens', 'hospedagens',
                  'experiencias', 'missao', 'conta', 'como-funciona', 'nave', 'admin']
Message = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class SectionInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    section: Section
    element_id: str | None = Field(default=None, min_length=1, max_length=120, pattern=r'^[a-z0-9-]+$')


class HistoryMessage(BaseModel):
    model_config = ConfigDict(extra='forbid')
    role: Literal['user', 'assistant']
    content: Message


class ChatInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    message: Message
    history: list[HistoryMessage] = Field(default_factory=list, max_length=10)
    context: SectionInput | None = None
    recommendation_context: str | None = Field(default=None, max_length=16000)

    @model_validator(mode='after')
    def limit_history(self):
        if sum(len(m.content) for m in self.history) > 8000:
            raise ValueError('Histórico excede 8000 caracteres.')
        if any(m.role != ('user' if i % 2 == 0 else 'assistant') for i, m in enumerate(self.history)):
            raise ValueError('Histórico deve alternar usuário e astronauta.')
        if self.history and self.history[-1].role != 'assistant':
            raise ValueError('Histórico deve conter apenas turnos completos.')
        return self


class Source(BaseModel):
    slug: str
    title: str


class AIOutput(BaseModel):
    message: str
    section: Section | None = None
    sources: list[Source] = Field(default_factory=list)
    cached: bool = False
    recommendations: list['Recommendation'] = Field(default_factory=list)
    recommendation_context: str | None = None


Category = Literal['terrain', 'trip', 'accommodation', 'experience']


class Criterion(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    field: str = Field(max_length=80, pattern=r'^[a-zA-Z0-9_.]+$')
    operator: Literal['contains', 'eq', 'gte', 'lte', 'relative_high', 'relative_low']
    value: str | float | bool = Field(default='')
    label: str = Field(min_length=1, max_length=120)
    essential: bool = False


class RecommendationIntent(BaseModel):
    model_config = ConfigDict(extra='forbid')
    action: Literal['chat', 'search', 'item', 'clarify'] = 'chat'
    category: Category | None = None
    criteria: list[Criterion] = Field(default_factory=list, max_length=12)
    max_price: float | None = Field(default=None, ge=0, le=9999999999, allow_inf_nan=False)
    currency: str | None = Field(default=None, max_length=10)
    cheaper: bool = False
    lower_than_previous: bool = False
    reset_preferences: bool = False
    clear_budget: bool = False
    remove_fields: list[str] = Field(default_factory=list, max_length=12)
    reference_index: int | None = Field(default=None, ge=1, le=3)
    question: str | None = Field(default=None, max_length=250)


class Recommendation(BaseModel):
    id: str
    code: str
    category: Category
    name: str
    description: str
    price: str
    currency: str
    available: bool
    image_url: str | None = None
    attributes: dict = Field(default_factory=dict)
    score: int = 0
    match: Literal['high', 'partial', 'none'] = 'none'
    matched: list[str] = Field(default_factory=list)
    missing: list[str] = Field(default_factory=list)
    reason: str = ''
    detail_path: str
