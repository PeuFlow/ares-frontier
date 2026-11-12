# Apresentação automática dos territórios

Implementação local em 11/11/2026, na abertura da página inicial. Não houve publicação.

## Comportamento

O cartão fixo foi substituído por uma sequência que reutiliza os seis objetos do catálogo, preservando identificadores, nomes, setores e coordenadas aproximadas. As descrições curtas são as fornecidas no pedido; não foram criados territórios ou alterados os dados usados pela IA.

Sem interação, o planeta gira continuamente, em um único sentido e a velocidade constante de 0,06 radiano por segundo, sem buscar ou parar em um território. Após uma breve introdução, a própria rotação leva os pontos à face visível e atualiza o destaque. Cada ponto recebe destaque no máximo uma vez por volta, por até 5,5 segundos, com saída de 0,6 segundo e intervalo mínimo de 0,8 segundo. O giro continua durante todas essas fases. Uma volta completa leva aproximadamente 105 segundos com taxa de quadros adequada. A velocidade foi reduzida de 0,08 para 0,06 para ampliar o tempo útil de leitura; a informação ainda pode sair antes do limite se o usuário mover o ponto para fora da área visível.

O globo também pode ser movimentado manualmente: arraste com o mouse para girar na horizontal e ajustar a inclinação, ou foque a área do planeta com Tab e use as setas do teclado. O giro automático pausa durante o controle manual e retoma da posição atual ao soltar. No toque, o gesto horizontal gira o planeta; o gesto vertical mantém a rolagem normal da página. Não há seleção ou navegação por clique nos marcadores.

Os cartões continuam associados aos pontos após os ajustes manuais. O cálculo de visibilidade usa a rotação e a inclinação reais da esfera; uma nova interação permite reapresentar regiões já visitadas. O movimento manual também permanece disponível com a preferência de movimento reduzido, mantendo o giro automático desativado.

O cartão acompanha o marcador na superfície e desaparece suavemente ao terminar a apresentação. Existem intervalos sem cartão entre as passagens dos territórios. A tentativa de manter a informação em um cartão fixo foi desfeita a pedido do usuário; o giro contínuo foi preservado.

A ordem acompanha a localização no planeta, não a ordem do catálogo. No teste, a passagem foi Valles Marineris → Olympus Mons → Arcadia Planitia → Elysium Planitia → Utopia Planitia → Jezero Basin → Valles Marineris novamente. Regiões fora do enquadramento aguardam sua passagem natural; não há rotação acelerada, inversão de sentido ou salto para o próximo ponto.

| Índice no catálogo | Território | Identificador existente |
| --- | --- | --- |
| 1 | Valles Marineris | `valles-07` |
| 2 | Elysium Planitia | `elysium-a104` |
| 3 | Utopia Planitia | `utopia-d208` |
| 4 | Arcadia Planitia | `arcadia-n016` |
| 5 | Jezero Basin | `jezero-j021` |
| 6 | Olympus Mons | `olympus-o052` |

Os pontos ficam na superfície, com orientação radial, e acompanham o grupo de rotação do planeta. O teste de profundidade oculta os pontos atrás da esfera; o cartão usa oclusão pela malha do planeta. A seleção do destaque observa a posição atual na face visível e reserva espaço para o cartão. O posicionamento usa as coordenadas ilustrativas já existentes, não um novo levantamento cartográfico. Textura artística, iluminação e fundo foram preservados.

Os marcadores e os cartões não têm eventos de clique, cursores de seleção ou navegação. Apenas a superfície de controle do globo recebe ponteiro e foco de teclado; os demais elementos informativos continuam sem interação. O destaque não escreve no estado global de seleção. O módulo “Exploração planetária”, abaixo da abertura, continua interativo.

Quando o globo sai da área visível ou a aba fica oculta, a sequência pausa. Com movimento reduzido, a apresentação fica estável, sem rotação contínua ou transições; os seis nomes e descrições continuam disponíveis na legenda acessível, sem anúncios automáticos repetidos. O globo de abertura usa renderização sob demanda nessa preferência. Sem WebGL, o fallback continua exibindo os cartões do catálogo.

## Arquivos

- `src/components/frontier/Hero.tsx`: substituição do cartão fixo pela apresentação.
- `src/components/frontier/TerritoryShowcase.tsx`: composição da abertura e legenda acessível.
- `src/components/frontier/TerritoryLabel.tsx`: identificação compacta com nome, característica e setor.
- `src/hooks/use-territory-presentation.ts`: visibilidade, movimento reduzido e recebimento do destaque calculado pelo globo; temporização independente apenas no fallback sem WebGL.
- `src/lib/territory-presentation.ts`: descrições, velocidade constante, cálculo de visibilidade e controle dos cartões durante a rotação.
- `src/components/three/MarsGlobe.tsx`: apresentação, controle por arraste e teclado, pausa do giro automático durante a interação e oclusão do cartão; módulo explorador preservado.
- `src/components/three/GlobeStage.tsx`: notificação de prontidão e conteúdo alternativo sem WebGL.
- `src/styles.css`: transições e bloqueio de interação limitados à apresentação.
- `src/test/territory-presentation.test.tsx`: oito testes de catálogo, fallback, pausa, movimento reduzido, passagens durante duas voltas, ausência de temporizador independente e visibilidade após inclinação manual.

Nenhuma alteração no Gemini, backend, banco, prompts ou outras páginas foi necessária. Não foram adicionadas dependências. As texturas e a malha principal são reutilizadas entre os destaques; a movimentação 3D atualiza referências, sem estado React por quadro.

## Validação

- **61 testes aprovados em 11 arquivos**; TypeScript, ESLint nos arquivos envolvidos e build aprovados.
- Na verificação visual anterior, com velocidade de 0,08 rad/s, os seis territórios apareceram durante o giro e o primeiro retornou na volta seguinte, sem saltos. Após aumentar o tempo de leitura e reduzir a velocidade para 0,06 rad/s, os testes de simulação foram repetidos para duas voltas completas. Os registros históricos de navegador mantêm a velocidade anterior.
- Fade-out medido durante a transição, com opacidade intermediária.
- Layouts de 1440 × 1000, 1366 × 768, 768 × 1024, 390 × 844 e 320 × 568: cartões contidos, sem rolagem horizontal. A checagem de tamanhos menores foi feita com Valles Marineris; os seis cartões foram verificados no desktop.
- Movimento reduzido: índice estável, texto visível e ausência de avanço automático durante a observação.
- Pausa fora da tela e seleção manual no explorador abaixo confirmadas no navegador.
- Fallback sem WebGL exibiu a identificação do território.
- Nenhuma exceção JavaScript e nenhuma chamada à IA no roteiro.
- Controle manual verificado no Chrome: rotação horizontal e vertical com o mouse, pausa ao segurar, retomada ao soltar, teclado, toque horizontal e rolagem vertical da página. As informações reapareceram após o arraste. Também foi confirmado o controle manual com movimento reduzido e a preservação da seleção independente no módulo explorador.

O build continua emitindo aviso sobre chunks grandes, incluindo o módulo 3D. A inspeção visual usou renderização por software; o desempenho em hardware modesto e dispositivos físicos ainda precisa ser medido. Não é uma validação cartográfica científica.

Evidências:

- [Abertura no desktop](review-territorios/desktop.png)
- [Apresentação em celular emulado](review-territorios/celular.png)
- [Fallback sem WebGL](review-territorios/fallback.png)
- [Resultados da rotação contínua no navegador](review-territorios/giro-continuo.json)
- [Resultados do controle manual](review-territorios/controle-manual.json)

Para revisar, inicie o projeto completo conforme o README e abra a página inicial como visitante ou com sua conta. Aguarde a sequência no primeiro globo. O servidor `demo:astronauta` é específico do chat e não exibe esta alteração.
