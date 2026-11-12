# Astronauta — auditoria, redesign e demonstração

Revisão inicial em 10/11/2026, com continuação da validação local em 11/11/2026. Nenhum deploy foi realizado.

## Demonstração interativa

Na raiz `ares-frontier-local`, execute:

```powershell
npm.cmd run demo:astronauta
```

Abra **http://127.0.0.1:8081/demos/astronauta.html**.

Esta entrada usa os componentes reais do astronauta, em um servidor separado, com sessão e respostas simuladas exclusivamente no documento da demonstração. Não consulta Gemini nem o banco. As requisições da demonstração não são encaminhadas à API real. Não está incluída no build normal da aplicação e não adiciona dependências.

Roteiro de revisão:

1. Abra a nave no canto inferior esquerdo e escolha **Conversar com o astronauta**.
2. Selecione uma sugestão: ela deve preencher o campo e aguardar o envio.
3. Envie com Enter, observe o processamento e leia a resposta com lista e destaques.
4. Use Shift + Enter para compor uma pergunta com mais de uma linha.
5. Feche e reabra a nave: conversa e rascunho permanecem na memória.
6. Inicie uma nova conversa para limpar o histórico.
7. Feche o chat, clique em **Simular falha na próxima resposta**, reabra e envie uma pergunta. Confira o erro e o rascunho recuperado; reenvie normalmente.
8. Feche o chat e solte o astronauta. Alterne as seções de teste para observar explicações contextuais. Cada contexto apresentado é lembrado durante a sessão.
9. Percorra os controles com Tab e feche a conversa com Escape. Repita em uma janela estreita.

Para testar Gemini de verdade, execute frontend e backend como descrito no README, abra **http://127.0.0.1:8080**, entre com sua conta e use a nave. A demonstração visual não substitui essa validação autenticada.

## Auditoria original

A etapa anterior à implementação foi uma inspeção do código dos componentes, dos estilos e dos testes. Não foram coletadas capturas da versão original; portanto, comparações visuais anteriores em dispositivos não são alegadas.

| Problema identificado | Mudança proposta e implementada |
| --- | --- |
| Fechar o chat executava o reset e apagava a conversa | Preservar mensagens e rascunho enquanto o componente está montado; limpar ao trocar de conta, sair, recarregar ou iniciar nova conversa |
| Campo de uma linha, sem composição multilinha | Textarea com crescimento até 144 px; Enter envia e Shift + Enter quebra a linha; composição de teclado respeitada |
| Toda atualização forçava rolagem para o final | Acompanhar o final quando o leitor está próximo dele; oferecer botão para retornar quando ele rola para cima |
| Estado inicial com uma única sugestão | Apresentação e quatro pontos de partida que preenchem o campo |
| Identificação sem estado explícito de disponibilidade ou indicação de IA no cabeçalho | Estado textual e visual da sessão e processamento, identificação de assistente com IA |
| Ações pequenas, tipografia de 10–12 px no balão e brilho contínuo na nave | Controles de pelo menos 44 px nas ações principais, texto contextual de 14 px e indicadores estáticos |
| Balão seguindo o ponteiro enquanto o usuário tenta ler | Estabilizar o personagem enquanto a fala está visível; preservar a seleção contextual e a deduplicação existentes |
| Animação de rolagem sem considerar movimento reduzido | Rolagem imediata e animações desativadas nessa preferência |
| Nave com camada acima do modal | Colocar nave e personagem abaixo dos diálogos; sobreposição identificada e corrigida durante a inspeção em celular |

## Componentes e recursos entregues

- `src/components/frontier/AstronautGuide.tsx`: cabeçalho, boas-vindas, sugestões, mensagens diferenciadas, compositor, rolagem, retenção em memória e feedback de falha.
- `src/components/frontier/AstroBuddy.tsx`: nave sem pulsação contínua, camadas corrigidas, balão com leitura mais confortável e posição estável durante a fala.
- `src/styles.css`: regras específicas do astronauta para área de fechar, entrada discreta das mensagens e indicador de processamento; respeitam movimento reduzido.
- `src/test/astronaut.test.tsx`: testes adicionais de teclado, sugestões, retenção do histórico e limpeza ao trocar de conta.
- `src/components/ui/dialog.tsx`: rótulo de fechamento opcional. O chat usa “Fechar conversa”; o padrão dos outros diálogos permanece igual.
- `demos/astronauta.html`, `demos/astronauta.tsx`, `demos/vite.config.ts`: demonstração isolada usando os componentes reais.
- `package.json`: comando `demo:astronauta`.

O componente `AstronautText` e sua renderização segura de listas e destaques foram reutilizados. O personagem atual foi preservado. Endpoints, integração com Gemini, prompts, autenticação, banco e páginas da aplicação não foram modificados. Não há persistência do chat em localStorage ou no banco; mantém-se o limite existente de 40 mensagens na memória.

## Evidências e testes

- **53 testes aprovados em 10 arquivos**, com Vitest.
- **27 testes aprovados do backend**, com SQLite em memória; sem gravação no banco configurado.
- `npm.cmd run ai:catalog:check`: aprovado.
- `tsc --noEmit`: aprovado para a aplicação.
- Build de produção: aprovado. O build ainda alerta sobre chunks acima de 500 kB, incluindo a cena 3D; não houve trabalho de otimização desses módulos.
- ESLint nos componentes, testes e demonstração: sem erros ou avisos.
- Inspeção automatizada no Chrome headless e leitura das capturas. Não substitui testes em dispositivos físicos.
- Verificados: sugestão sem envio automático, resposta formatada, estado de espera, retenção ao reabrir, erro com restauração da pergunta e explicação contextual.
- Tab permaneceu dentro do diálogo em 18 passos; Escape fechou o chat quando o campo estava focado.
- Preferência de movimento reduzido emulada: indicador com `animation-name: none`.
- Nenhuma exceção JavaScript capturada durante o roteiro de demonstração.

| Tela emulada | Diálogo dentro da tela | Compositor visível | Envio com área de 44 × 44 px | Sem rolagem horizontal |
| --- | --- | --- | --- | --- |
| Desktop — 1440 × 900 | Sim | Sim | Sim | Sim |
| Notebook — 1366 × 768 | Sim | Sim | Sim | Sim |
| Tablet — 768 × 1024 | Sim | Sim | Sim | Sim |
| Celular — 390 × 844 | Sim | Sim | Sim | Sim |
| Compacto — 320 × 568 | Sim | Sim | Sim | Sim |

As medições acima são do estado inicial do chat. Em telas estreitas, as sugestões rolam dentro da área de mensagens, mantendo o compositor disponível. Teclado virtual e orientação em aparelho físico ainda precisam de revisão.

Contraste medido por conversão das cores do tema no canvas do navegador: texto principal/fundo do cartão **16,29:1**, texto secundário/cartão **6,76:1**, destaque mineral/cartão **7,84:1**. São amostras das cores de texto usadas, não uma certificação de conformidade de toda a aplicação.

Capturas:

- [Estado inicial no desktop](review-astronauta/desktop-inicial.png)
- [Estado inicial no celular](review-astronauta/celular-inicial.png)
- [Conversa com resposta simulada](review-astronauta/desktop-conversa.png)
- [Erro recuperável](review-astronauta/desktop-erro.png)
- [Astronauta contextual](review-astronauta/desktop-contextual.png)
- [Medições do roteiro automatizado](review-astronauta/results.json)

## Autoavaliação heurística

As notas consideram as inspeções e evidências acima. Não representam resultado de pesquisa com usuários, certificação WCAG ou autorização para produção.

| Critério | Nota | Evidência e limitação |
| --- | --- | --- |
| Hierarquia visual | 14/15 | Capturas mostram cabeçalho, conversa e compositor separados; falta avaliar com usuários |
| Consistência visual | 14/15 | Personagem, tema e componentes existentes reutilizados; falta revisão visual em outros navegadores |
| Facilidade de uso | 18/20 | Sugestões, Enter, recuperação do rascunho e retenção testados; falta teste de tarefas com exploradores reais |
| Responsividade | 14/15 | Cinco tamanhos com geometria e compositor aprovados; falta teclado virtual em aparelho físico |
| Acessibilidade | 12/15 | Foco contido, Escape, alvos principais, amostras de contraste e movimento reduzido verificados; faltam leitor de tela, zoom de 200% e auditoria completa WCAG 2.2 AA |
| Feedback e estados | 9/10 | Espera, erro, recuperação, estado inicial e resposta verificados com simulação; falta roteiro completo com Gemini autenticado |
| Desempenho e fluidez | 8/10 | Sem novas bibliotecas, build aprovado e animações de opacidade/transformação; falta perfil em dispositivo modesto e revisão dos chunks grandes |
| **Total** | **89/100** | **Avaliação provisória para revisão do redesign** |

## Situação do ambiente e próximos passos

A chave e o modelo Gemini estão configurados, sem exposição de seus valores. A API inicialmente retornou HTTP 503 porque o processo no sandbox não conseguia alcançar o banco. Uma consulta somente leitura (`SELECT 1`) fora do sandbox funcionou; após reiniciar a API com acesso à rede, `/api/health` retornou `status: ok`, `api: connected`, `database: connected`.

Frontend e demonstração responderam HTTP 200. Não foi usada uma conta real e não foram criados usuários, sessões autenticadas de teste ou alterações no banco. A conversa real com Gemini via login permanece pendente de validação pelo titular da conta.

Antes de decidir pelo deploy, revisar a demonstração visual, validar o chat autenticado e seu contexto com Gemini e completar a revisão em celular com teclado virtual. Para uma avaliação mais ampla, testar leitor de tela, zoom, outros navegadores e desempenho em hardware modesto. A aprovação visual do usuário e a validação funcional real ainda são necessárias para a decisão de produção.

O balão contextual continua sendo uma sobreposição temporária sobre a página. Sua posição estável e o fechamento acessível facilitam a leitura, mas a verificação de oclusão de conteúdo importante em todas as seções reais ainda está pendente.

## Continuação — 11/11/2026

Foram concluídos ajustes adicionais dentro do escopo local:

- O astronauta deixa de manter um ciclo contínuo de `requestAnimationFrame` com movimento reduzido ou ponteiro sem precisão. Mudanças de preferência, tamanho da janela e tamanho do balão atualizam a posição quando necessário.
- Ao fechar o chat, o foco volta ao botão da nave. O controle de fechamento tem rótulo em português.
- O campo é dimensionado também ao montar novamente um rascunho multilinha, respeitando o limite de altura.
- Testes cobrem a preservação da posição de leitura quando chega uma resposta, retorno ao final, rolagem com movimento reduzido, foco e remontagem do rascunho.
- Em janelas com até 480 px de altura, o cabeçalho fica compacto, detalhes auxiliares são ocultados e a altura do campo acompanha o espaço disponível. A identidade do astronauta e a identificação de IA permanecem.
- O erro passou para a área rolável das mensagens. O botão de retorno ao final não ocupa mais uma linha adicional no layout. Esses ajustes corrigem o corte do envio observado ao combinar falha e rascunho longo em janela baixa.
- A rolagem automática atualiza diretamente a área de mensagens antes da pintura; a transição suave fica reservada ao botão de retorno, respeitando movimento reduzido. Mudanças de tamanho acompanham o final somente quando o leitor já estava próximo dele.

No Chrome headless, texto de usuário com 1.950 caracteres sem espaços não gerou rolagem horizontal. Campo e envio permaneceram dentro do diálogo em 1440 × 900, 720 × 450, 390 × 430, 390 × 320 e 844 × 390. Com erro e rascunho de dez linhas, também passaram 390 × 320, 320 × 320 e 844 × 390. O retorno de foco à nave foi confirmado no navegador. Não foram capturadas exceções JavaScript nesses roteiros.

A janela de 720 × 450 exercita o espaço de layout equivalente à metade de 1440 × 900; não comprova zoom nativo de 200%. As janelas baixas também não substituem o teclado virtual em celular físico.

- [Medições complementares](review-astronauta/compact-results.json)
- [Erro e rascunho em janela baixa](review-astronauta/compacto-erro.png)

### Teste real do Gemini

Após autorização explícita do usuário, foi executada **uma única geração** pelo serviço existente com a pergunta “Como posso explorar Marte?” e os trechos retornados pela consulta de conhecimento. A consulta ocorreu em transação PostgreSQL somente leitura. Não foram modificados prompts, configurações, contas ou dados.

A geração falhou: o serviço mapeou o erro para **HTTP 503**, com a mensagem “O rádio do astronauta está indisponível. Tente novamente em instantes.” Uma consulta posterior apenas aos metadados confirmou que o modelo configurado está disponível e declara suporte a `generateContent`. Isso não comprova o funcionamento da geração, e a causa específica da falha não foi determinada. Não houve nova tentativa de geração automática.

Naquela etapa, o roteiro autenticado no navegador ainda estava pendente; os resultados posteriores estão na seção “Teste do projeto completo”. A nota heurística permanece em 89/100; esses testes adicionais não equivalem a certificação de acessibilidade ou aprovação de produção.

### Correção da repetição na demonstração

A demonstração devolvia uma única resposta fixa para qualquer pergunta, repetindo as recomendações mesmo após escolher “Planejar missão”. A simulação agora identifica o assunto escolhido, apresenta orientações específicas e usa o histórico para continuar respostas curtas, como “Sim”. É possível mudar entre missão, viagens, hospedagens, territórios e exploração. Perguntas fora dos roteiros recebem uma explicação dos limites da simulação.

O comportamento fica em `demos/astronauta-responses.ts`, separado do serviço real. Cinco testes de regressão cobrem a sequência observada, a continuação, as quatro sugestões iniciais, a troca de assunto e perguntas não suportadas. Essa correção não altera prompts ou integração com Gemini; a demonstração continua usando respostas roteirizadas.

## Teste do projeto completo — 11/11/2026

Foi iniciado o frontend principal na porta 8080, com proxy para a API real na porta 8000, usando o PostgreSQL configurado. `/api/health` retornou API e banco conectados. Esta execução não usa o servidor de demonstração da porta 8081.

Os 53 testes do frontend e 27 do backend passaram novamente, assim como TypeScript, verificação do catálogo da IA e build. Os testes automatizados do backend usam SQLite em memória. Permanecem os avisos de tamanho de chunks do build.

### Fluxo real como visitante

Foi usado um perfil isolado do Chrome headless, com armazenamento próprio, para verificar:

- Entrada como visitante e bloqueio do campo do chat sem autenticação.
- API de chat respondendo 401 sem sessão e 403 sem o cabeçalho CSRF.
- Navegação pelos catálogos de viagens, hospedagens, experiências e territórios, planejador e central de missões.
- Inclusão de viagem e hospedagem no planejador; reserva demonstrativa gerando protocolo `AF-SIM`.
- Busca sem resultados e limpeza de filtros.
- Favoritar um território e preservar o favorito após recarregar.
- Comparar dois territórios na tabela.
- Catálogo em 390 × 844 sem rolagem horizontal.
- Renderização do globo 3D, sem uso do fallback.

Não houve exceções JavaScript no roteiro final. As respostas 401/403 registradas na rede foram esperadas nos testes de proteção. O globo foi exercitado em renderização por software no navegador automatizado; isso não comprova desempenho da GPU em dispositivos físicos.

A missão, a reserva e os favoritos desse roteiro ficaram apenas no armazenamento do navegador isolado. Nenhuma conta foi criada nessa etapa.

- [Resultados do fluxo de visitante](review-astronauta/full-guest-results.json)
- [Planejador com viagem e hospedagem](review-astronauta/completo-missao.png)
- [Comparação de territórios](review-astronauta/completo-comparacao.png)
- [Globo 3D em celular emulado](review-astronauta/completo-globo.png)

### Etapa autenticada

Após autorização explícita, o teste foi executado com contas temporárias de papel `explorer`, usando a interface principal, os endpoints normais de autenticação e a API real de IA. Não foram usados mocks nem substituições da autenticação. As senhas aleatórias e os valores dos cookies ficaram somente na memória dos processos e no navegador isolado; não foram gravados nos arquivos de evidência.

| Verificação | Resultado |
| --- | --- |
| Cadastro pela interface e `/api/auth/me` | Aprovado |
| Cookie de sessão HttpOnly, caminho `/api`, SameSite Lax | Aprovado |
| Ausência da senha temporária no localStorage | Aprovado |
| Restauração da sessão após recarregar | Aprovado |
| Logout, recusa de senha incorreta e novo login correto | Aprovado |
| Renovação do token no novo login | Aprovado |
| Pergunta “Como posso explorar Marte?” pelo chat | Primeira execução: 503; segunda execução: 200, com resposta real exibida |
| Continuação sobre planejamento de missão | 503; não foi possível aprovar a continuidade da conversa na interface |
| Bloqueio de envio durante processamento | Aprovado |
| Erro visível e pergunta recuperada no campo | Aprovado nos retornos 503 |
| Explicação contextual pela API real | 200; a última execução usou cache (`cached: true`) |
| Exceções JavaScript | Nenhuma capturada nos roteiros autenticados |

A resposta real exibida orientou o explorador a girar o globo, selecionar marcadores e consultar relevo, exposição solar, estabilidade, recursos e riscos. Essa resposta veio de `/api/ai/chat`, não do roteiro da demonstração da porta 8081.

Foram feitas duas consultas diagnósticas adicionais diretamente pelo serviço existente, com leitura do conhecimento em transação somente leitura: uma pergunta inicial e uma continuação com histórico. Ambas geraram respostas. Isso mostra que o serviço consegue responder, mas não identifica a causa dos 503 intermitentes nem comprova recuperação da continuação pelo navegador.

O teste completo detectou uma ressalva de confiabilidade: a IA alternou sucesso e falha. A produção ainda precisa de uma sequência autenticada estável, incluindo continuação da conversa e tratamento dos erros do provedor. Não foram alterados prompts, endpoints, configuração do modelo ou lógica de autenticação durante esses testes.

Foram criadas duas contas temporárias em execuções sequenciais. Ao concluir, ambas foram removidas por UUID e e-mail exatos, com verificação adicional de nome e papel `explorer`. Uma consulta somente leitura confirmou **zero contas de teste restantes e zero sessões dessas contas**. As operações de limpeza foram restritas aos registros criados para este teste.

- [Resultados da primeira execução autenticada](review-astronauta/full-auth-initial-results.json)
- [Resultados da segunda execução autenticada](review-astronauta/full-auth-results.json)
- [Diagnóstico da continuação](review-astronauta/full-ai-diagnostic.json)
- [Verificação da limpeza](review-astronauta/full-auth-cleanup.json)
- [Chat real com resposta e erro recuperável](review-astronauta/completo-ia-autenticada.png)

### Reproduzir a aplicação completa

Para reproduzir a aplicação completa, abra dois terminais PowerShell na pasta `C:\Users\pedro\Downloads\Projetos\ares-frontier\ares-frontier-local`.

Terminal da API:

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Terminal do frontend:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 8080 --strictPort
```

Abra **http://127.0.0.1:8080/** e mantenha os dois terminais abertos. Para testar a IA, entre com uma conta e abra “Conversar com o astronauta” pelo botão da nave.
