// Scripted local preview only; never used by the real Gemini integration.
type Topic = "explorar" | "territorios" | "missao" | "hospedagens" | "viagens";
interface Turn {
  role: "user" | "assistant";
  content: string;
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
function topicOf(text: string): Topic | undefined {
  const value = normalize(text);
  if (/missao|planej|organizar/.test(value)) return "missao";
  if (/hosped|habitat|dormir|diaria/.test(value)) return "hospedagens";
  if (/territor|terreno|lote|regio/.test(value)) return "territorios";
  if (/viage|viagem|trajeto|expedicao/.test(value)) return "viagens";
  if (/explor|marte|comec/.test(value)) return "explorar";
  return undefined;
}

const replies: Record<Topic, [string, string]> = {
  explorar: [
    "Podemos explorar Marte por três caminhos:\n- **Explorar territórios:** conhecer as paisagens marcianas.\n- **Comparar hospedagens:** encontrar sua base de exploração.\n- **Planejar uma missão:** organizar as etapas da viagem.\n\nQual desses caminhos você quer explorar primeiro?",
    "Comece pelo globo: escolha um marcador e abra os detalhes da região. Depois, compare dois territórios para observar suas diferenças antes de definir o próximo destino.",
  ],
  missao: [
    "Vamos planejar sua missão, comandante.\n\n- **Viagem:** escolha o trajeto.\n- **Hospedagem:** defina sua base e o número de noites.\n- **Experiências:** selecione as atividades.\n- **Território:** adicione um destino, se desejar.\n\nComeçamos pela viagem ou você já tem uma escolhida?",
    "A primeira etapa é escolher a viagem. Na aplicação completa, abra **Viagens**, confira duração e itens inclusos e adicione uma opção à missão. Depois escolha a hospedagem e as noites; o planejador reúne os itens e calcula o total. Nesta demonstração, estamos apenas ensaiando a conversa.",
  ],
  hospedagens: [
    "Vamos encontrar sua base de exploração. Compare as hospedagens por **tipo de habitat**, **capacidade**, **comodidades** e **valor por noite**. Depois escolha a quantidade de noites para o planejamento. Você quer entender como comparar os habitats?",
    "Para comparar os habitats, comece pela capacidade necessária e pelas comodidades que você procura. Em seguida, confira a diária e defina as noites. Na aplicação completa, a seleção pode ser adicionada à missão; esta conversa simulada não altera o planejamento.",
  ],
  territorios: [
    "Vamos conhecer os territórios. Filtre por perfil **científico**, **residencial** ou **industrial** e abra os detalhes das regiões. Você pode comparar até dois terrenos antes de escolher seu destino. Quer começar pela comparação?",
    "Na aplicação completa, selecione dois terrenos para comparar e observe área, recursos, riscos e preço em MC. Favoritar uma região ajuda a encontrá-la novamente. A melhor escolha depende do perfil que você deseja explorar; esta demonstração não seleciona um terreno por você.",
  ],
  viagens: [
    "Vamos escolher a viagem. Compare **categoria**, **duração**, **capacidade** e **itens inclusos** antes de adicionar uma opção à missão. Quer seguir com as etapas dessa escolha?",
    "Abra o catálogo de viagens na aplicação completa, confira os detalhes de uma opção e use a ação de adicionar à missão. O próximo passo é definir a hospedagem e as noites. Aqui, o fluxo é uma simulação visual e nenhuma reserva é realizada.",
  ],
};

export function demoAstronautReply(message: string, history: readonly Turn[] = []): string {
  const previous = [...history]
    .reverse()
    .find((turn) => turn.role === "user" && topicOf(turn.content));
  const previousTopic = previous ? topicOf(previous.content) : undefined;
  const explicitTopic = topicOf(message);
  const value = normalize(message).trim();
  const continuation =
    /^(sim|pode|vamos|quero|ok|certo|continu|e depois|qual|como|primeir|proxim|essa|esse)/.test(
      value,
    );
  const topic = explicitTopic ?? (continuation ? previousTopic : undefined);
  if (!topic)
    return "Esta demonstração usa respostas roteirizadas para exploração, territórios, hospedagens, viagens e planejamento de missão. Para avaliar uma pergunta livre com IA, use o chat autenticado da aplicação completa.";
  return replies[topic][previousTopic === topic ? 1 : 0];
}
