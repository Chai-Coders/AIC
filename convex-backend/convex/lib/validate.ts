import { ConvexError } from "convex/values";

type TextRule = { required?: boolean; max?: number };

/** Trims `value` and enforces the same limits the Django models had. */
export function text(value: string, label: string, { required = false, max }: TextRule = {}) {
  const trimmed = value.trim();
  if (required && !trimmed) {
    throw new ConvexError(`Please fill in "${label}".`);
  }
  if (max !== undefined && trimmed.length > max) {
    throw new ConvexError(`"${label}" can be at most ${max} characters.`);
  }
  return trimmed;
}

/** Empty becomes undefined; anything else must be an http(s) URL. */
export function optionalUrl(value: string | undefined, label: string) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return undefined;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new ConvexError(`"${label}" must be a full web address, like https://example.com`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ConvexError(`"${label}" must start with https://`);
  }
  return trimmed;
}

/** Today's date in UTC as YYYY-MM-DD (Django used TIME_ZONE = "UTC"). */
export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
