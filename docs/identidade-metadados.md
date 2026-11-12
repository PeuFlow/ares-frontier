# Identidade e metadados do Ares Frontier

## Estrutura e diagnóstico

- React 19, TanStack Start/Router, Vite e Nitro. O documento HTML é produzido por `src/routes/__root.tsx`, com `HeadContent` e `Scripts`; não existe `index.html` principal.
- As rotas já tinham títulos e descrições próprios, mas faltavam canonical, URLs de compartilhamento, imagens, tema e parte das tags do Twitter.
- `LogoMark`, em `src/components/frontier/Logo.tsx`, já define o símbolo de planeta, órbita e satélite. O novo favicon preserva essa geometria e adapta as cores para vermelho marciano, laranja e fundo escuro.
- `src/assets/trip-orbit.jpg` é a imagem original do projeto usada na composição social; não foi necessário buscar ou gerar outra paisagem.
- O domínio público utilizado é `https://ares-frontier-eqed.vercel.app`, identificado no link de acesso publicado no README. O domínio `ares-frontier.vercel.app` aparece como destino do proxy da API em `vercel.json` e não foi usado como canonical. A conexão externa ao domínio público não pôde ser concluída neste ambiente; a confirmação foi documental, no repositório.

## Implementação e arquivos

| Arquivo | Alteração |
| --- | --- |
| `src/lib/seo.ts` | Origem pública, title e description solicitados, helper de metadados por rota, Open Graph, Twitter Cards e canonical absoluto. |
| `src/routes/__root.tsx` | UTF-8 e viewport preservados, theme-color, fallback noindex para rotas desconhecidas e links para os ícones. |
| `src/routes/index.tsx` | Title e description exatamente como solicitados. |
| `src/routes/territorios.tsx` | Metadados da rota e H1 acessível, preservando os H2 das seções existentes. |
| `src/routes/viagens.tsx`, `hospedagens.tsx`, `experiencias.tsx` | Metadados completos com título, descrição e canonical próprios. |
| `src/routes/login.tsx`, `cadastro.tsx`, `esqueci-senha.tsx`, `conta.tsx`, `missao.tsx`, `admin.tsx` | Somente configuração do head: metadados próprios e `noindex, nofollow`. |
| `public/favicon.svg` | Fonte vetorial do ícone. |
| `public/favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png` | Versões raster do ícone. |
| `public/favicon.ico` | Ícone com entradas de 16, 32 e 48 px. |
| `public/apple-touch-icon.png` | Ícone de 180 px para dispositivos Apple. |
| `public/images/ares-frontier-social.svg` | Composição editável, com imagem incorporada, símbolo e texto da marca. |
| `public/images/ares-frontier-social.png` | Imagem social de 1200 × 630 px, usada em Open Graph e Twitter. |
| `public/robots.txt` | Referência ao sitemap e bloqueio de rastreamento de `/api/`. |
| `public/sitemap.xml` | Inicial, territórios, viagens, hospedagens e experiências; sem áreas internas. |
| `scripts/generate-identity-assets.mjs` | Regenera os PNGs, ICO e composição social a partir do SVG e da imagem artística existente, sem dependências adicionais. Requer Chrome local com depuração na porta 9222. |
| `docs/identidade-metadados.md` | Diagnóstico, inventário e resultados desta implementação. |

As páginas com `noindex` permanecem rastreáveis para que os buscadores consigam ler a diretiva no HTML. Robots não é um controle de acesso; as verificações existentes de autenticação e autorização foram preservadas.

## Validação local

- `npm.cmd test`: 10 arquivos e 53 testes passaram.
- `npm.cmd run build`: build de produção concluído.
- `npx.cmd tsc --noEmit`: passou sem erros.
- HTML renderizado pelo Worker de produção: verificados `/`, `/territorios`, `/viagens`, `/hospedagens`, `/experiencias`, `/login`, `/cadastro`, `/esqueci-senha`, `/conta`, `/missao`, `/admin` e uma URL inexistente. Um title por documento; tags sociais sem duplicação, canonical por rota e robots conforme a política. A URL inexistente retornou 404 e noindex.
- HTTP: SVG, ICO, PNGs, Apple Touch Icon, imagem social, robots e sitemap retornaram 200 com tipos de conteúdo apropriados.
- Chrome: SVG e imagens raster decodificados; PNG de favicon com 32 × 32 px, Apple Touch Icon com 180 × 180 px e imagem social com 1200 × 630 px.
- O Chrome solicitou `/favicon.svg` automaticamente e recebeu HTTP 200. O diretório binário do ICO foi conferido: três entradas PNG válidas, de 16, 32 e 48 px.
- Navegação pelo link da barra para viagens atualizou title, canonical e Twitter sem recarregar a página e manteve uma única description.
- Responsividade: cinco páginas públicas em 1440 × 900, 768 × 1024, 390 × 844 e 320 × 568; 20 combinações sem overflow horizontal, com exatamente um H1 e sem saltos entre H1/H2/H3. Nenhuma exceção JavaScript não tratada foi registrada nessa execução.
- O navegador foi testado como visitante, com resposta 401 simulada apenas para `/api/auth/me`. Não foram realizados cadastros, reservas ou chamadas ao Gemini durante essa verificação.

O comando existente `npm.cmd run preview` procura `dist/server/server.js`, mas o build deste projeto produz `.output/server/index.mjs` para Cloudflare. A inspeção de produção foi feita carregando esse Worker em um adaptador HTTP local temporário, servindo os arquivos de `.output/public`. Os arquivos temporários e as evidências ficaram em `.preview.local`, ignorado pelo Git. O preview padrão não foi modificado.

## Limites e publicação

O conteúdo do corpo continua dependendo da verificação de sessão e da tela de entrada existentes: o HTML inicial contém o estado de carregamento, e os títulos de conteúdo são verificados após a hidratação. Isso limita a descoberta de conteúdo por robôs que não executam JavaScript. Os metadados estão presentes no HTML inicial, independentemente da sessão. Essa limitação foi mantida para respeitar o escopo de não alterar autenticação ou apresentação de entrada.

As alterações são locais; não houve publicação. Os novos caminhos de imagem no domínio público estarão disponíveis após o deploy. A apresentação efetiva nas abas e os caches de redes sociais devem ser conferidos depois da publicação, pois a verificação local usou Chrome headless e não acessou os validadores externos.

Backend, integração Gemini, lógica de autenticação e banco de dados não foram alterados. Alterações preexistentes na interface do astronauta e outros arquivos do usuário foram preservadas.
