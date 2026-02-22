const SCX_REF = /scx:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

export function extractScxRefs(text: string): string[] {
  return [...new Set([...text.matchAll(SCX_REF)].map((m) => m[1]))];
}

export function stripScxRefs(text: string): string {
  return text
    .replace(SCX_REF, "")
    .replace(/\n+$/, "")
    .trim();
}
