import { describe, expect, it } from "vitest";
import { demoAstronautReply } from "../../demos/astronauta-responses";

describe("scripted astronaut preview", () => {
  it("follows the selected mission option instead of repeating the exploration menu", () => {
    const first = demoAstronautReply("Como posso explorar Marte?");
    const reply = demoAstronautReply("Planejar missão", [
      { role: "user", content: "Como posso explorar Marte?" },
      { role: "assistant", content: first },
    ]);
    expect(first).toContain("três caminhos");
    expect(reply).toContain("Vamos planejar sua missão");
    expect(reply).not.toContain("três caminhos");
    expect(reply).not.toBe(first);
  });

  it("keeps the mission context for a short follow-up", () => {
    const reply = demoAstronautReply("Sim", [
      { role: "user", content: "Planejar missão" },
      { role: "assistant", content: demoAstronautReply("Planejar missão") },
    ]);
    expect(reply).toContain("A primeira etapa é escolher a viagem");
    expect(reply).not.toContain("Começamos pela viagem");
  });

  it("gives each welcome suggestion a different relevant response", () => {
    const questions = [
      "Como posso explorar Marte?",
      "Quais territórios você recomenda?",
      "Como planejar uma missão?",
      "Quero conhecer as hospedagens.",
    ];
    expect(new Set(questions.map((question) => demoAstronautReply(question))).size).toBe(4);
    expect(demoAstronautReply("PLANEJAR MISSAO")).toContain("Vamos planejar sua missão");
  });

  it("allows changing topics instead of retaining the previous recommendation", () => {
    const reply = demoAstronautReply("Quero conhecer as hospedagens.", [
      { role: "user", content: "Planejar missão" },
    ]);
    expect(reply).toContain("Vamos encontrar sua base");
    expect(reply).not.toContain("Vamos planejar sua missão");
  });

  it("explains the simulation limit for unsupported questions", () => {
    expect(demoAstronautReply("Qual a temperatura agora?")).toContain("respostas roteirizadas");
  });
});
