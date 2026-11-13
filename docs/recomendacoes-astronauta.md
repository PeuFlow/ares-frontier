# Recomendações do astronauta

Implementação validada localmente, sem migração de banco. O catálogo já existente
no site foi importado de forma aditiva no Neon para alimentar as recomendações.

## Arquitetura

O chat continua em `AstronautGuide.tsx` e usa os endpoints autenticados existentes
de FastAPI. A integração `gemini_service.generate` agora aceita um modelo Pydantic
para enviar `response_json_schema` ao mesmo cliente Gemini. O resultado também é
validado no servidor. O uso de `response_schema` com esta versão do SDK enviava
`additional_properties` em um formato rejeitado pelo provedor; a alternativa JSON
Schema foi validada com uma chamada real.

Fluxo de busca:

1. Validar o contexto assinado, limitado à conta autenticada e a duas horas.
2. Ler uma amostra limitada de nomes, tipos e valores de atributos para interpretar
   a linguagem usando o vocabulário real do catálogo.
3. Gemini retorna intenção, categoria, critérios, teto explícito, moeda e referência
   ordinal. Identificadores, links, imagens, preços e disponibilidade não fazem
   parte desse contrato de interpretação.
4. O servidor preserva preferências omitidas em refinamentos da mesma categoria;
   permite remoção explícita e reinício. Uma mudança de categoria descarta critérios
   anteriores incompatíveis.
5. Consultar `catalog_items` via SQLAlchemy com categoria, disponibilidade, moeda
   e teto numérico quando informado. O teto precisa constar da mensagem ou do
   contexto previamente assinado; “barato” apenas prioriza preços menores.
6. Comparar atributos JSONB, números, valores explícitos e conceitos equivalentes.
   Pedidos relativos usam a mediana dos candidatos e exigem valores distintos;
   não há limites financeiros ou limiares físicos inventados.
7. Nas buscas gerais, ordenar por nível de correspondência e pontuação ponderada.
   Para pedidos econômicos, como “territorio barato”, retornar **somente a opção
   disponível de menor preço entre as compatíveis**, preservando exigências e teto.
   Apenas esse registro é enviado ao Gemini para explicar a recomendação.
   Exigência não atendida impede correspondência alta ou parcial. Se não houver
   compatíveis, retornar alternativas com os critérios não confirmados: uma em
   pedidos econômicos, até três nas buscas gerais.
8. Gemini explica os registros selecionados em uma segunda saída estruturada.
   Os motivos incluem também os diagnósticos factuais do servidor. Os demais
   campos dos cartões vêm exclusivamente dos registros consultados.

O estado assinado contém critérios e a ordem dos UUIDs apresentados. O segredo
HMAC deriva da chave Gemini já existente, sem nova variável de ambiente. Rotacionar
a chave invalida contextos anteriores. O navegador mantém esse estado em memória,
junto à conversa; nova conversa, troca de conta e recarga limpam o histórico.
Perguntas sobre “o segundo” consultam novamente o UUID daquela posição, incluindo
alterações de preço, exclusão e indisponibilidade. “Mais barato que os anteriores”
busca preço estritamente inferior ao menor preço atual dos registros apresentados.

Explicações automáticas sobre a interface continuam usando o catálogo demonstrativo
existente. O caminho de conversa geral não usa esse catálogo estático para sugerir
produtos; recomendações usam exclusivamente `catalog_items`.

## Cartões e detalhes

Os quatro caminhos existentes aceitam `?catalog_item=<UUID>`:

| Categoria | Caminho | Ação |
| --- | --- | --- |
| terrain | `/territorios` | Conhecer território |
| trip | `/viagens` | Ver viagem |
| accommodation | `/hospedagens` | Conhecer hospedagem |
| experience | `/experiencias` | Ver experiência |

Os diálogos antigos resolvem identificadores do catálogo estático, não UUIDs do
PostgreSQL. Para preservar seus comportamentos, `CatalogItemDetails` acrescenta
uma visualização com o mesmo padrão de Dialog nessas rotas. Ela consulta
`GET /api/ai/catalog/{UUID}`, exige autenticação, confere categoria e mostra erro
para registros removidos. Ao fechar, remove o parâmetro da URL.

O clique fecha a nave sem apagar sua conversa. Imagens ausentes ou URLs inseguras
são omitidas; erros de carregamento escondem a imagem. Campos opcionais conhecidos
são exibidos apenas quando existem, sem placeholders inventados.

## Arquivos

- `backend/app/schemas/ai.py`: contratos de intenção, critérios e cartões.
- `backend/app/services/recommendation_service.py`: contexto assinado, interpretação,
  consulta, pontuação, alternativas e consulta de detalhes.
- `backend/app/services/catalog_import_service.py`, `backend/app/cli.py`: importação
  explícita, validada e aditiva dos itens existentes no site, sem sobrescrever preços,
  disponibilidade, atributos ou UUIDs de registros já cadastrados.
- `backend/app/services/gemini_service.py`: saída JSON estruturada no cliente existente.
- `backend/app/services/knowledge_service.py`: separação do catálogo demonstrativo nas
  explicações gerais do chat.
- `backend/app/routers/ai.py`: integração ao chat e endpoint de detalhes autenticado;
  POSTs preservam a proteção CSRF.
- `src/lib/ai-api.ts`: contratos, consulta de detalhes e contexto da conversa; só
  texto e papéis são enviados no histórico, sem reenviar cartões como fatos.
- `src/lib/catalog-images.ts`: resolução das imagens exportadas para as URLs de
  assets geradas pelo Vite tanto no desenvolvimento quanto no build.
- `src/lib/auth-api.ts`: timeout de 40 s apenas no chat, pois há duas etapas Gemini.
- `src/components/frontier/AstronautGuide.tsx`: cartões e estado em memória.
- `src/components/frontier/RecommendationCard.tsx`: cartão responsivo e ações.
- `src/components/frontier/CatalogItemDetails.tsx`: validação de UUID e detalhes.
- `src/routes/territorios.tsx`, `viagens.tsx`, `hospedagens.tsx`, `experiencias.tsx`:
  parâmetro de busca e montagem da visualização de detalhes.
- `backend/tests/test_ai.py`, `backend/tests/test_recommendations.py`,
  `src/test/astronaut.test.tsx`, `src/test/recommendations.test.tsx`: contratos,
  regressões, segurança, recomendações, histórico e navegação.
- `backend/tests/test_catalog_import.py`: importação do catálogo do site, idempotência,
  preservação de edições, unidades de preço e regressões das perguntas das capturas.

## Verificação e limites

A causa das respostas vazias era a diferença entre o catálogo estático visível no
site e a tabela `catalog_items`, que estava vazia. Foram importados os **18 itens
existentes**: 6 territórios, 4 viagens, 3 hospedagens e 5 experiências. Não foram
criadas novas opções nem inferidas características ausentes. Os itens continuam
sendo demonstrativos; `available` indica opção publicada na simulação.

O importador usa o slug existente como código e um UUID determinístico. Mantém os
atributos originais e acrescenta aliases para área e duração, sem transformar o
índice de relevo em altitude. Hospedagens preservam a diária e mostram `/ noite`.
Reexecutar o importador não sobrescreve registros existentes e não duplica itens.
Para conferir e importar novos itens publicados no código, execute:

```powershell
# Na raiz do projeto, atualiza o JSON público a partir dos dados TypeScript:
npm.cmd run ai:catalog
# A partir de backend, confira a prévia antes de aplicar:
.venv/Scripts/python.exe -m app.cli import-catalog
.venv/Scripts/python.exe -m app.cli import-catalog --apply
```

As perguntas “Quais territórios você recomenda?” e “territorio barato” foram
validadas com Gemini e Neon após a importação, retornando cartões de registros reais.
Uma categoria sem registros agora informa que ainda não possui itens cadastrados,
em vez de sugerir que o usuário flexibilize preferências para um catálogo vazio.

Os testes usam catálogo isolado em SQLite, sem chamadas pagas ou gravações no Neon.
Cobrem as quatro categorias, atributos específicos, teto, moeda, catálogo vazio,
alternativas, exigências, pedidos mais baratos, referência ao segundo cartão,
mudança de disponibilidade, imagens e atributos ausentes, limites, UUIDs,
autenticação e contexto adulterado ou de outra conta.

Comandos executados na raiz (o primeiro a partir de `backend`):

```powershell
.venv/Scripts/python.exe -m unittest discover -s tests -p 'test_*.py'
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build
```

Verificação adicional no Chrome headless com respostas simuladas apenas na sessão
local: botões das quatro categorias, UUID e detalhes corretos, retorno à nave com
histórico preservado, propagação do contexto e ausência de overflow horizontal em
390 px; inspeção visual em 1440 × 1000 e 390 × 844.

As verificações descritas ocorreram no ambiente local. A correspondência
depende dos atributos efetivamente cadastrados: dados ausentes ficam identificados
como não confirmados. O mapeamento semântico usa Gemini para traduzir a intenção
para campos e valores existentes e equivalências limitadas no comparador; não há
inferência de comodidades, ciência ou qualidade que não estejam cadastradas.
