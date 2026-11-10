// Export only public catalog data. TypeScript remains the source of truth.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);
function load(name) {
  const source = readFileSync(new URL(`src/data/${name}.ts`, root), "utf8").replace(
    /^import (\w+) from "([^\"]+)";$/gm,
    (_, id, path) => `const ${id} = ${JSON.stringify(path.replace("@/", "/src/"))};`,
  );
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, Intl },
  );
  return exports;
}
const { TERRITORIES } = load("territories");
const { TRIPS, STAYS, EXPERIENCES } = load("catalog");
const groups = {
  territorios: TERRITORIES,
  viagens: TRIPS,
  hospedagens: STAYS,
  experiencias: EXPERIENCES,
};
const records = Object.entries(groups).flatMap(([section, items]) =>
  items.map((item) => ({
    slug: item.id,
    section,
    title: item.name ?? `${item.region} · ${item.lot}`,
    summary: item.description ?? item.summary,
    context_data: {
      ...item,
      fictional: true,
      currency: "MC",
      availability: "Não há disponibilidade real; catálogo demonstrativo.",
    },
  })),
);
const target = new URL("backend/app/data/catalog.json", root);
const output = JSON.stringify(records, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== output)
    throw new Error("Catálogo da IA desatualizado. Execute npm run ai:catalog.");
} else {
  writeFileSync(target, output);
  console.log(`Catálogo público exportado: ${fileURLToPath(target)}`);
}
