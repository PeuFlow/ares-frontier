# Astronauta Gemini

## Ajustes da experiência local

Um único botão de nave abre **Soltar/Recolher astronauta** e **Conversar com o astronauta**, inclusive com toque. Abrir o chat recolhe o personagem. As explicações automáticas aparecem somente enquanto ele está solto; em telas com toque, fica junto à nave. Os dois recursos mantêm o histórico separado e compartilham o acesso pela nave.

A IA contextual fala no próprio balão do robô que acompanha o ponteiro, substituindo as reações genéricas a cliques. O personagem assume expressão de pensamento enquanto aguarda a resposta. O balão acompanha o robô e ajusta sua posição para permanecer dentro da tela; contém ações para fechar ou pausar as explicações. Também é possível pausar/reativar pela nave. Respostas de uma seção abandonada são descartadas, e os cliques comuns não apagam a explicação atual. Visitantes recebem um convite para entrar; a integração Gemini continua usando a sessão existente.

As explicações agora usam até 35 palavras; o chat usa até 70, ou até 120 se forem pedidos mais detalhes. Avisos sobre demonstração e ficção ficam no contexto interno e só são explicados quando a pergunta envolve ciência real, propriedade, compra ou reserva efetiva. O cabeçalho do chat também foi simplificado. `src/components/frontier/AstronautText.tsx` renderiza negrito e listas simples sem asteriscos visíveis e sem interpretar HTML.

Para testar, abra a nave, escolha **Soltar astronauta**, navegue entre seções e depois use a mesma nave para **Conversar com o astronauta**. Verifique se a resposta vai direto ao assunto, sem repetir os avisos.

## Auditoria e decisões

O frontend usa React 19, TypeScript, TanStack Start/Router, Vite, Tailwind 4 e Radix UI. Three.js continua carregado somente no cliente. `__root.tsx` compõe os providers, rotas e o astronauta SVG existente. Foram preservadas suas animações, o foguete e a identidade visual.

As rotas são início, territórios, viagens, hospedagens, experiências, missão, conta, login, cadastro, recuperação de senha e administração. Não foi criada outra rota. A conversa da nave abre em um diálogo separado das explicações automáticas, também disponível em dispositivos com toque.

`use-frontier.tsx` controla seleção, detalhes, favoritos e comparação; `use-mission.tsx` mantém planejamento e reservas demonstrativas no navegador. Os catálogos exibidos vêm de `src/data/territories.ts` e `src/data/catalog.ts`. As tabelas de catálogo e missões ainda não alimentam essa interface. A IA não recebe dados pessoais, reservas ou senhas e não altera a missão.

O backend usa FastAPI, SQLAlchemy, Pydantic Settings e PostgreSQL/Neon com Alembic. Há modelos User, CatalogItem, Mission, MissionItem, Favorite, ContentBlock, AuthSession e AdminDeletionLog. `content_blocks` já consta do modelo `entities.py` e da migração inicial: slug, seção, título, resumo, corpo, JSON contextual, imagens, `is_active` e datas. Foi reaproveitado sem migração ou escrita no banco. A existência física dessa tabela no Neon não foi consultada nesta sessão.

Login mantém Argon2, cookie HttpOnly e sessões revogáveis. Os dois endpoints de IA usam a sessão e a proteção CSRF existentes. Visitantes recebem um convite para entrar antes de conversar; as reações locais do astronauta continuam disponíveis no desktop.

O projeto já tem frontend e backend separados na Vercel. O rewrite `/api/*` foi preservado. O build local mantém o preset Cloudflare padrão da configuração Lovable/Nitro; a configuração existente detecta a Vercel no ambiente de hospedagem. Não houve alteração estrutural, migração, push ou deploy.

## API e conhecimento

`POST /api/ai/section-context` recebe `{ "section": "territorios", "element_id": "valles-07" }`; `element_id` é opcional. Retorna `message`, `section`, `sources` (slugs/títulos utilizados) e `cached`.

`POST /api/ai/chat` recebe:

```json
{
  "message": "Qual a diferença entre as hospedagens?",
  "history": [],
  "context": { "section": "hospedagens" }
}
```

Os endpoints exigem cookie de sessão, origem autorizada e `X-Ares-CSRF: 1`. Aceitam mensagens de até 2.000 caracteres e histórico alternado de turnos completos `user`/`assistant`, com até 10 mensagens e 8.000 caracteres somados. Papéis `system` e campos extras são rejeitados. O frontend mantém até 40 mensagens visíveis e envia somente os turnos recentes dentro do limite. Fechar a conversa, trocar de conta ou iniciar nova conversa descarta o histórico, sem persistência no banco ou navegador.

A recuperação combina blocos publicados do banco com uma exportação controlada dos catálogos TypeScript atuais. Blocos com o mesmo slug substituem a demonstração; `is_active=false` suprime o fallback daquele slug. Falhas do banco não produzem fallback silencioso. Cada pergunta recebe até 6 registros e 18.000 caracteres, escolhidos por seção, nomes, tópicos e perguntas recentes. Referências muito indiretas podem exigir citar o nome do item: não foi adicionado mecanismo de busca semântica.

Seções aceitas: `inicio`, `explorar`, `territorios`, `viagens`, `hospedagens`, `experiencias`, `missao`, `conta`, `como-funciona`, `nave`, `admin`. Elementos usam IDs reais dos catálogos. Para conteúdo editorial, use esses identificadores em `slug` e `section`. Esta integração é somente leitura e não cria outro editor administrativo.

Rotas, seções visíveis, seleção do globo, detalhes de território e metadados dos botões de viagens/habitats/experiências determinam o contexto. Há debounce de 1 segundo, fila de chamadas contextuais, descarte de respostas obsoletas e supressão de explicações já vistas enquanto o guia estiver montado. Explicações podem ser pausadas. Não são inseridas como turnos do chat.

O prompt define personalidade, reconhecimento de lacunas, resistência a instruções do histórico e uso exclusivo das fontes selecionadas. Catálogos, preços MC, índices, recursos, riscos e coordenadas pertencem à ficção em 2089, inclusive quando seus nomes lembram ciência real. Não há pesquisa científica externa. Essas regras reduzem invenções; a avaliação de respostas reais ainda é necessária.

Há limite de 12 chamadas por usuário/minuto, uma geração em andamento por usuário e 8 gerações simultâneas por processo. Explicações ficam em cache por 10 minutos, até 256 entradas, identificadas pelo conteúdo, seção e modelo. Conversas não são cacheadas. O SDK faz uma tentativa, com timeout e tratamento de 429, indisponibilidade e resposta vazia, sem devolver erros internos ou credenciais.

Cache e limites são **por processo**: reiniciam em cold starts e não garantem uma quota distribuída entre instâncias Vercel. Configure também quotas no projeto Google para controlar gasto total. Uma quota global estrita exigiria armazenamento compartilhado, não introduzido aqui.

## Configuração local

Na pasta `backend`, execute:

```powershell
.venv/Scripts/python.exe -m pip install -r requirements.txt
```

Edite somente o arquivo ignorado `backend/.env`, preservando os valores existentes:

```dotenv
GEMINI_API_KEY=SUA_CHAVE_LOCAL
GEMINI_MODEL=ID_DO_MODELO_HABILITADO
```

Obtenha a chave no [Google AI Studio](https://aistudio.google.com/apikey) e escolha um [modelo disponível para seu projeto](https://ai.google.dev/gemini-api/docs/models). O [SDK oficial Python](https://googleapis.github.io/python-genai/) é `google-genai`; usamos `Client().aio.models.generate_content`, instrução de sistema e fechamento do cliente assíncrono. Versão instalada e validada: 2.34.0. Não use prefixo `VITE_` nem copie essas variáveis para o frontend. `.env.example` contém somente campos vazios.

Reinicie a API após editar as variáveis. Na pasta `backend`:

```powershell
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

Na raiz do frontend, em outro terminal:

```powershell
npm.cmd run dev
```

O Vite já encaminha `/api` à porta 8000. Use um banco de desenvolvimento com o esquema existente aplicado para autenticar e consultar `content_blocks`. Nenhuma migração nova é exigida pela IA.

## Vercel

No projeto **backend** (`ares-frontier`, Root Directory `backend`), abra **Settings → Environment Variables**. Adicione `GEMINI_API_KEY` e `GEMINI_MODEL` nos ambientes desejados. Preserve `DATABASE_URL`, `FRONTEND_ORIGINS` e a configuração de sessão descrita em `backend/README.md`. O frontend não precisa receber variáveis Gemini nem alterar o rewrite.

Para ativar em produção, será necessário publicar o backend e o frontend atualizados pelo fluxo habitual. Variáveis novas exigem novo deploy do backend. Nada foi publicado automaticamente.

## Atualizar os catálogos

Após editar `src/data/territories.ts` ou `src/data/catalog.ts`, execute na raiz:

```powershell
npm.cmd run ai:catalog
npm.cmd run ai:catalog:check
```

Versione `backend/app/data/catalog.json` junto da alteração. O exportador compila as constantes públicas TypeScript; não analisa conteúdo enviado por usuários. O segundo comando detecta divergências e pode ser incluído no CI existente. O navegador envia identificadores, sem preços ou descrições livres usados como fonte confiável.

## Validação

Na raiz:

```powershell
node node_modules/typescript/bin/tsc --noEmit
npm.cmd test
npm.cmd run ai:catalog:check
npm.cmd run build
```

Na pasta `backend`:

```powershell
.venv/Scripts/python.exe -m unittest discover -s tests -v
```

Os testes usam SQLite isolado e Gemini simulado, sem escrever no Neon ou consumir API paga. Cobrem sessão/CSRF, dados de Valles, cache, publicação/despublicação, validação de entradas, histórico, tópicos e referências, limites e erros do SDK. A interface verifica envio, nova conversa, duplicatas, respostas obsoletas, recuperação após falha e visitantes. Login/cadastro e administração continuam na suíte existente.

Validação manual após configurar a chave:

1. Entre com uma conta e navegue entre início, exploração, territórios, viagens, hospedagens, experiências, missão e conta. Em Network, confira `/api/ai/section-context` com identificadores mínimos. Repita um contexto e confira a supressão.
2. Selecione Valles (`valles-07`) no globo e nos detalhes: compare a resposta com Setor 07, área e atributos cadastrados. Troque de território. Abra detalhes de uma viagem/habitat e selecione uma atividade.
3. Abra o chat da nave. Pergunte sobre territórios, diferenças entre habitats, atividades, viagens e planejamento. Faça uma continuação como “e quanto custa?”. Teste botão, Enter, indicador, nova conversa, fechar/reabrir e troca de conta.
4. Pergunte por disponibilidade real em uma data específica ou peça para inventar um preço: deve admitir a falta de dados. Pergunte se um risco/índice é ciência validada: deve explicar a ficção.
5. Desligue a API: confira erro e recuperação do rascunho. Sem chave/modelo, espere 503. Os testes simulam 429 e falhas de rede, sem provocar gastos para esgotar quotas reais.
6. Inspecione 360×800, 768×1024 e 1440×900: chat dentro da tela, lista com rolagem, campo acessível, foco preso no diálogo, Escape para fechar e balões sem impedir controles. Confira as animações desktop e movimento reduzido.
7. Teste login, cadastro, logout, favoritos, comparação, planejamento e reserva demonstrativa. A IA não deve alterar esses fluxos.
8. Inspecione os assets públicos: nenhuma chave, variável `GEMINI_*` ou SDK Python deve estar no JavaScript. A API também não devolve configurações nem erros brutos do provedor.

Teste real realizado em 09/11/2026 após configuração da chave: `gemini-2.5-flash` retornou 404 para geração, embora aparecesse na listagem do provedor. `gemini-flash-lite-latest` respondeu e foi definido somente no `.env` local, preservando as demais variáveis. Login/cadastro em SQLite isolado retornou 201; os endpoints contextual e chat retornaram 200 usando o Google real, com aproximadamente 1–2 segundos por resposta. Valles foi descrito com Setor 07, 420 km² e 1.280.000 MC; o pedido de disponibilidade real e confirmação de reserva foi recusado por falta de dados. O cache retornou `cached=true`. Foi reforçada a instrução de explicação de elementos específicos e o novo teste real confirmou a descrição de Valles. Os 10 testes automatizados de IA também passaram após esse ajuste.

Pendências: inspeção visual em navegador e diferentes resoluções, pois não há ferramenta de navegador nesta sessão, e validação com a sessão/banco reais da aplicação. Os testes acima usam banco e usuário temporários, sem consultar ou escrever no Neon. Não houve migração, push ou deploy. Na Vercel, configure também um modelo validado para o ambiente de destino; o `.env` local não é enviado automaticamente.

## Arquivos criados e modificados

Criados: `backend/app/schemas/ai.py`, `backend/app/routers/ai.py`, `backend/app/services/gemini_service.py`, `backend/app/services/knowledge_service.py`, `backend/app/data/catalog.json`, `backend/tests/test_ai.py`, `scripts/export-ai-catalog.mjs`, `src/lib/ai-api.ts`, `src/hooks/use-astronaut-context.ts`, `src/components/frontier/AstronautGuide.tsx`, `src/test/astronaut.test.tsx`, `src/test/astronaut-context.test.tsx`, `docs/gemini-astronauta.md`.

Modificados: `backend/app/core/config.py`, `backend/app/main.py`, `backend/requirements.txt`, `backend/.env.example`, `backend/README.md`, `package.json`, `src/components/frontier/AstroBuddy.tsx`, `src/routes/viagens.tsx`, `src/routes/hospedagens.tsx`, `src/routes/experiencias.tsx`.
