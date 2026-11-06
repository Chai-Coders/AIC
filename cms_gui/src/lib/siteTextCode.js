// The "Code" view of the Site text page: a page's texts as plain lines of
//   key = "text"
// grouped under `# Group` comments. Inside the quotes, \n is a line break and
// \" and \\ stand for a quote and a backslash.

const quote = (value) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;

const unquote = (body) => body.replace(/\\(.)/g, (_, c) => (c === 'n' ? '\n' : c));

/** `groups` is [{ name, shared, fields: [{ key }] }]; `valueOf(key)` the text shown now. */
export function toCode(groups, valueOf) {
  const out = [];
  for (const group of groups) {
    if (out.length) out.push('');
    out.push(`# ${group.name}${group.shared ? ' (all pages)' : ''}`);
    for (const field of group.fields) out.push(`${field.key} = ${quote(valueOf(field.key))}`);
  }
  return out.join('\n');
}

const LINE = /^\s*([a-z0-9_.]+)\s*=\s*"((?:[^"\\]|\\.)*)"\s*$/i;
const KEY_AT_START = /^\s*([a-z0-9_.]+)\s*=/i;

/**
 * Reads the code back. Returns { values: { key: text }, errors: [{ line, message }] }
 * (lines counted from 0). Lines with errors are left out of `values`.
 */
export function parseCode(code, knownKeys) {
  const values = {};
  const errors = [];
  code.split('\n').forEach((text, line) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = text.match(LINE);
    if (!match) {
      errors.push({ line, message: 'Expected key = "text"' });
    } else if (!knownKeys.has(match[1])) {
      errors.push({ line, message: `Unknown key ${match[1]}` });
    } else if (match[1] in values) {
      errors.push({ line, message: `${match[1]} appears twice` });
    } else {
      values[match[1]] = unquote(match[2]);
    }
  });
  return { values, errors };
}

/** The key written at the start of a line, if any. */
export function keyOfLine(text) {
  return text.match(KEY_AT_START)?.[1] ?? null;
}
