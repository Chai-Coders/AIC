// Word-level comparison of two texts, for the before / after view on the
// Versions page. Returns the pieces of each side, marked as kept or changed.

const MAX_CELLS = 400_000;

const tokenize = (text) => text.split(/(\s+)/).filter(Boolean);

/**
 * @returns {{ before: {text: string, changed: boolean}[], after: {text: string, changed: boolean}[] }}
 */
export function wordDiff(beforeText, afterText) {
  const a = tokenize(beforeText ?? '');
  const b = tokenize(afterText ?? '');

  // Skip the common start and end so long articles with a small edit stay fast.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const keepA = new Array(midA.length).fill(false);
  const keepB = new Array(midB.length).fill(false);

  // Longest common subsequence of the middle, unless it is too big to compare.
  if (midA.length && midB.length && midA.length * midB.length <= MAX_CELLS) {
    const n = midA.length;
    const m = midB.length;
    const table = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        table[i][j] = midA[i] === midB[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) {
        keepA[i++] = true;
        keepB[j++] = true;
      } else if (table[i + 1][j] >= table[i][j + 1]) i++;
      else j++;
    }
  }

  const pieces = (tokens, mid, keep) => {
    const out = [];
    const push = (text, changed) => {
      // Whitespace between two changed words reads as part of the change.
      const last = out[out.length - 1];
      if (last && last.changed === changed) last.text += text;
      else out.push({ text, changed });
    };
    tokens.slice(0, start).forEach((t) => push(t, false));
    mid.forEach((t, k) => push(t, !keep[k] && /\S/.test(t)));
    tokens.slice(start + mid.length).forEach((t) => push(t, false));
    return out;
  };

  return { before: pieces(a, midA, keepA), after: pieces(b, midB, keepB) };
}
