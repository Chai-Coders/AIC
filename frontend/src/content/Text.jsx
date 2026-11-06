import React, { useCallback, useMemo, useState } from 'react';
import useApi from '../hooks/useApi';
import { fetchSiteText } from '../api/content';
import { FIELDS } from './registry';
import { EDIT_MODE } from './editMode';
import { TextContext, useText } from './useText';

// Website text: what was published from the CMS, falling back to the text in
// registry.js. Inside the CMS preview (EDIT_MODE) the CMS sends the published
// text with its unpublished edits on top, which replaces what was loaded here.

export function TextProvider({ children }) {
  const { data: published } = useApi(fetchSiteText, {});
  const [drafts, setDrafts] = useState(null);

  const get = useCallback(
    (key) => {
      const value = (drafts ?? published)[key] ?? FIELDS[key]?.value;
      if (value === undefined) {
        if (import.meta.env.DEV) console.warn(`[text] "${key}" is not in src/content/registry.js`);
        return key;
      }
      return value;
    },
    [drafts, published]
  );

  const value = useMemo(() => ({ get, setDrafts }), [get]);
  return <TextContext.Provider value={value}>{children}</TextContext.Provider>;
}

const RICH = /(\*\*[^*]+\*\*|\*[^*]+\*)/;

// `*words*` become italics and `**words**` bold; everything else stays plain text.
const renderRich = (value) =>
  value.split(RICH).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });

/** One editable text. Renders just the text, wrapped in a selectable span in the CMS preview. */
export function Text({ k }) {
  const value = useText()(k);
  const content = FIELDS[k]?.kind === 'rich' ? renderRich(value) : value;
  return EDIT_MODE ? <span data-cms-key={k}>{content}</span> : content;
}

/** Makes `children` (showing the text `k` in some other form, like a list) selectable in the CMS preview. */
export function Editable({ k, children }) {
  return EDIT_MODE ? <span data-cms-key={k}>{children}</span> : children;
}
