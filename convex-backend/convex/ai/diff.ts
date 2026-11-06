// A small line diff, for the review agent and the CMS "Changes" tab. It needs
// no dependency: common lines at both ends are skipped, then an LCS runs on
// what's left. Very large rewrites fall back to "all removed, all added".

const MAX_CELLS = 4_000_000;
const CONTEXT = 3;

type Line = { kind: " " | "-" | "+"; text: string };

function middleDiff(a: string[], b: string[]): Line[] {
  if (a.length * b.length > MAX_CELLS) {
    return [...a.map((text) => ({ kind: "-" as const, text })), ...b.map((text) => ({ kind: "+" as const, text }))];
  }
  const width = b.length + 1;
  const table = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * width + j] =
        a[i] === b[j] ? table[(i + 1) * width + j + 1] + 1 : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  const out: Line[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push({ kind: " ", text: a[i] });
      i++;
      j++;
    } else if (j < b.length && (i === a.length || table[i * width + j + 1] >= table[(i + 1) * width + j])) {
      out.push({ kind: "+", text: b[j++] });
    } else {
      out.push({ kind: "-", text: a[i++] });
    }
  }
  return out;
}

/** Unified-style diff text, without the file header. Null content = no file. */
export function lineDiff(before: string | null, after: string | null) {
  const a = before === null ? [] : before.split("\n");
  const b = after === null ? [] : after.split("\n");
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const lines: Line[] = [
    ...a.slice(0, start).map((text) => ({ kind: " " as const, text })),
    ...middleDiff(a.slice(start, endA), b.slice(start, endB)),
    ...a.slice(endA).map((text) => ({ kind: " " as const, text })),
  ];

  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, i) => {
    if (line.kind === " ") return;
    for (let k = Math.max(0, i - CONTEXT); k <= Math.min(lines.length - 1, i + CONTEXT); k++) keep[k] = true;
  });

  const out: string[] = [];
  let oldLine = 1;
  let skipping = false;
  lines.forEach((line, i) => {
    if (keep[i]) {
      if (skipping) out.push(`@@ line ${oldLine} @@`);
      else if (i === 0) out.push(`@@ line 1 @@`);
      skipping = false;
      out.push(`${line.kind}${line.text}`);
    } else {
      skipping = true;
    }
    if (line.kind !== "+") oldLine++;
  });
  return out.join("\n");
}
