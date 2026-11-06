import { useEffect, useRef, useState } from 'react';
import { keyOfLine, parseCode, toCode } from '../../lib/siteTextCode';

const LINE_HEIGHT = 20;
const TOKENS = /^(\s*)([a-z0-9_.]+)(\s*=\s*)("(?:[^"\\]|\\.)*"?)?(.*)$/i;

function highlight(text) {
  if (text.trim().startsWith('#')) return <span className="italic text-muted-foreground">{text}</span>;
  const m = text.match(TOKENS);
  if (!m) return text;
  return (
    <>
      {m[1]}
      <span className="text-accent-foreground">{m[2]}</span>
      {m[3]}
      {m[4] && <span className="text-success">{m[4]}</span>}
      {m[5]}
    </>
  );
}

// Same font, size, padding and wrapping on the textarea and the coloured copy
// behind it, so the two line up exactly.
const TEXT = 'm-0 whitespace-pre font-mono text-[12.5px] leading-5';
const PAD = 'py-3 pl-[52px] pr-3';

/**
 * The page's texts as editable `key = "text"` lines. Every valid line is
 * applied as you type (`onChangeMany`); lines with mistakes are listed below
 * and ignored until fixed. Mount it again (new `key`) to rebuild the code.
 */
export default function CodePanel({ fileName, groups, valueOf, knownKeys, selected, focusRequest, onChangeMany, onSelect }) {
  const [code, setCode] = useState(() => toCode(groups, valueOf));
  const [errors, setErrors] = useState([]);
  const [cursor, setCursor] = useState({ line: 0, col: 1 });
  const textareaRef = useRef(null);
  const backRef = useRef(null);
  const gutterRef = useRef(null);

  const lines = code.split('\n');
  const errorLines = new Set(errors.map((e) => e.line));

  const syncScroll = () => {
    const ta = textareaRef.current;
    if (backRef.current) {
      backRef.current.scrollTop = ta.scrollTop;
      backRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  };

  const updateCursor = () => {
    const ta = textareaRef.current;
    const before = ta.value.slice(0, ta.selectionStart);
    const line = before.split('\n').length - 1;
    setCursor({ line, col: ta.selectionStart - before.lastIndexOf('\n') });
    const key = keyOfLine(ta.value.split('\n')[line] ?? '');
    if (key && knownKeys.has(key) && key !== selected) onSelect(key);
  };

  const handleChange = (e) => {
    setCode(e.target.value);
    const parsed = parseCode(e.target.value, knownKeys);
    setErrors(parsed.errors);
    onChangeMany(parsed.values);
  };

  // Text clicked in the preview: select its line.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!focusRequest || !ta) return;
    const all = ta.value.split('\n');
    const line = all.findIndex((l) => keyOfLine(l) === focusRequest.key);
    if (line < 0) return;
    const start = all.slice(0, line).join('\n').length + (line ? 1 : 0);
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(start, start + all[line].length);
    ta.scrollTop = Math.max(0, line * LINE_HEIGHT - ta.clientHeight / 3);
    ta.dispatchEvent(new Event('scroll'));
    setCursor({ line, col: 1 });
  }, [focusRequest]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/40">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground">
        <span>Editing</span>
        <span className="font-mono font-semibold text-foreground">{fileName}</span>
        <span className="ml-auto hidden sm:inline">
          One <code className="font-mono font-semibold text-foreground">key = "text"</code> per line
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-20 w-10 select-none overflow-hidden border-r border-border bg-muted/40 py-3 text-right font-mono text-[12.5px] leading-5 text-muted-foreground"
        >
          {lines.map((_, i) => (
            <div key={i} className={`pr-2 ${i === cursor.line ? 'font-bold text-primary' : 'opacity-70'}`}>
              {i + 1}
            </div>
          ))}
        </div>
        <div ref={backRef} aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden text-foreground ${TEXT} ${PAD}`}>
          {lines.map((text, i) => (
            <div
              key={i}
              className={`-ml-[52px] -mr-[2000px] pl-[52px] pr-[2000px] ${
                errorLines.has(i) ? 'bg-destructive/15' : i === cursor.line ? 'bg-primary/10' : ''
              }`}
            >
              {highlight(text) || ' '}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleChange}
          onSelect={updateCursor}
          onScroll={syncScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="Page text as code"
          className={`absolute inset-0 z-10 h-full w-full resize-none overflow-auto border-0 bg-transparent text-transparent caret-foreground outline-none selection:bg-primary/30 ${TEXT} ${PAD}`}
        />
      </div>

      <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground">
        <span>
          Ln {cursor.line + 1}, Col {cursor.col}
        </span>
        {errors.length > 0 ? (
          <span className="font-semibold text-destructive" role="status">
            Line {errors[0].line + 1}: {errors[0].message}
            {errors.length > 1 && ` (and ${errors.length - 1} more)`}
          </span>
        ) : (
          <span className="font-semibold text-success">No errors</span>
        )}
        <span className="ml-auto">\n is a line break · *italic* · **bold**</span>
      </div>
    </div>
  );
}
