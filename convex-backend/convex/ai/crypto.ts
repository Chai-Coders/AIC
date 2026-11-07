// Encrypts the LLM provider API keys at rest with AES-256-GCM. The master key
// is the AI_SETTINGS_KEY environment variable (32 random bytes, base64):
//
//   npx convex env set AI_SETTINGS_KEY "$(openssl rand -base64 32)"
//
// Only call encrypt() from an action: queries and mutations get seeded,
// repeatable random numbers, and an AES-GCM IV must never repeat.
import { ConvexError } from "convex/values";

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function masterKey() {
  const raw = process.env.AI_SETTINGS_KEY;
  if (!raw) {
    throw new ConvexError("The AI Assistant is not set up: AI_SETTINGS_KEY is missing on the server.");
  }
  const bytes = fromB64(raw);
  if (bytes.length !== 32) {
    throw new ConvexError("AI_SETTINGS_KEY must be 32 bytes, base64 encoded.");
  }
  return await crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encrypt(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await masterKey(), new TextEncoder().encode(plain));
  return { ciphertext: toB64(new Uint8Array(data)), iv: toB64(iv) };
}

export async function decrypt({ ciphertext, iv }: { ciphertext: string; iv: string }) {
  const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, await masterKey(), fromB64(ciphertext));
  return new TextDecoder().decode(data);
}
