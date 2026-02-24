/** Safely decode URL-encoded param (e.g. "El%20Paso" → "El Paso") */
export function safeDecodeParam(s: string | undefined): string | undefined {
  if (!s) return undefined;
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
