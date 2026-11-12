// Rebuild with Chrome running locally with --remote-debugging-port=9222.
// Uses only Node and the browser's SVG/canvas renderer; no asset dependencies.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const pages = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const socket = new WebSocket(pages.find((page) => page.type === "page").webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let serial = 0;
const pending = new Map();
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id) return;
  const task = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) task.reject(new Error(message.error.message));
  else task.resolve(message.result);
};
const call = (method, params) => new Promise((resolve, reject) => {
  pending.set(++serial, { resolve, reject });
  socket.send(JSON.stringify({ id: serial, method, params }));
});

async function png(svg, width, height = width) {
  const result = await call("Runtime.evaluate", {
    expression: `(async () => {
      const image = new Image();
      image.src = ${JSON.stringify(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`)};
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = ${width}; canvas.height = ${height};
      canvas.getContext('2d').drawImage(image, 0, 0, ${width}, ${height});
      return canvas.toDataURL('image/png').split(',')[1];
    })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return Buffer.from(result.result.value, "base64");
}

try {
  const mark = await readFile(new URL("public/favicon.svg", root), "utf8");
  const icons = [];
  for (const size of [16, 32, 48, 180]) {
    const bytes = await png(mark, size);
    const name = size === 180 ? "apple-touch-icon.png" : `favicon-${size}x${size}.png`;
    await writeFile(new URL(`public/${name}`, root), bytes);
    if (size !== 180) icons.push({ size, bytes });
  }
  const directory = Buffer.alloc(6 + icons.length * 16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(icons.length, 4);
  let offset = directory.length;
  icons.forEach(({ size, bytes }, index) => {
    const entry = 6 + index * 16;
    directory[entry] = size; directory[entry + 1] = size;
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(bytes.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += bytes.length;
  });
  await writeFile(new URL("public/favicon.ico", root), Buffer.concat([directory, ...icons.map(({ bytes }) => bytes)]));

  const photo = (await readFile(new URL("src/assets/trip-orbit.jpg", root))).toString("base64");
  const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><linearGradient id="shade"><stop stop-color="#11151b"/><stop offset=".7" stop-color="#11151b" stop-opacity=".55"/><stop offset="1" stop-color="#11151b" stop-opacity=".12"/></linearGradient></defs>
    <rect width="1200" height="630" fill="#11151b"/>
    <image href="data:image/jpeg;base64,${photo}" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>
    <rect width="1200" height="630" fill="url(#shade)"/>
    <path d="M64 56h1072M64 574h1072" stroke="#ed9b62" stroke-opacity=".45"/>
    <svg x="60" y="92" width="80" height="80" viewBox="0 0 32 32">${mark.replace(/<svg[^>]*>|<\/svg>/g, "")}</svg>
    <text x="160" y="140" fill="#eee9e2" font-family="Arial, sans-serif" font-size="25" letter-spacing="6">ARES FRONTIER</text>
    <text x="64" y="295" fill="#eee9e2" font-family="Arial, sans-serif" font-size="86" font-weight="700">Explore Marte.</text>
    <text x="68" y="352" fill="#ed9b62" font-family="Arial, sans-serif" font-size="24" letter-spacing="3">UM NOVO MUNDO. UM NOVO HORIZONTE.</text>
    <text x="68" y="507" fill="#eee9e2" font-family="Arial, sans-serif" font-size="22">Territórios · Viagens · Hospedagens · Experiências</text>
    <text x="68" y="546" fill="#eee9e2" fill-opacity=".65" font-family="Arial, sans-serif" font-size="16">Plataforma conceitual de exploração marciana</text>
  </svg>`;
  await mkdir(new URL("public/images/", root), { recursive: true });
  await writeFile(new URL("public/images/ares-frontier-social.svg", root), social);
  await writeFile(new URL("public/images/ares-frontier-social.png", root), await png(social, 1200, 630));
  console.log(`Identity assets generated in ${fileURLToPath(new URL("public/", root))}`);
} finally {
  socket.close();
}
