/** Render the small Markdown subset used by the astronaut without accepting HTML. */
export function AstronautText({ text }: { text: string }) {
  const blocks: { list: boolean; lines: string[] }[] = [];
  let separated = true;
  for (const line of text.split("\n")) {
    if (!line.trim()) {
      separated = true;
      continue;
    }
    const list = /^\s*[-*]\s+/.test(line);
    const previous = blocks.at(-1);
    if (!separated && previous?.list === list) previous.lines.push(line);
    else blocks.push({ list, lines: [line] });
    separated = false;
  }
  const inline = (value: string) =>
    value.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      ) : (
        part
      ),
    );
  return (
    <div className="space-y-2 whitespace-normal">
      {blocks.map(({ list, lines }, i) => {
        if (list) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-4">
              {lines.map((line, j) => (
                <li key={j}>{inline(line.replace(/^\s*[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {inline(lines.join("\n"))}
          </p>
        );
      })}
    </div>
  );
}
