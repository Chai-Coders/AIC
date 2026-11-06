import { createContext, useCallback, useContext } from 'react';
import { FIELDS } from './registry';
import { EDIT_MODE } from './editMode';

// Hooks for reading website text (provided by TextProvider in Text.jsx).

export const TextContext = createContext(null);

export const useTextContext = () => useContext(TextContext);

/** `t(key)`: the text as a plain string, for attributes and computed strings. */
export function useText() {
  return useTextContext().get;
}

const splitLines = (value) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

/** `list(key)`: a list text as an array of its non-empty lines. */
export function useList() {
  const get = useText();
  return useCallback((key) => splitLines(get(key)), [get]);
}

/** `has(key)`: true when the text exists and is not empty, for optional elements. */
export function useHasText() {
  const get = useText();
  return useCallback((key) => key in FIELDS && get(key).trim() !== '', [get]);
}

/** Props that let the CMS preview select the element showing `key`. */
export const cmsKey = (key) => (EDIT_MODE ? { 'data-cms-key': key } : {});
