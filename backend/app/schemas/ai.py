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
