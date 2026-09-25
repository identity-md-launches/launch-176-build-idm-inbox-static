export type MessageTag = 'ethscription' | 'hidden characters removed';
export interface DecodedMessage { text: string; tags: MessageTag[]; urls: string[] }
export const URL_RE = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;
const hidden = /[\u202A-\u202E\u2066-\u2069\u200B-\u200D\uFEFF]/g;
// eslint-disable-next-line no-control-regex
const controls = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;

export function decodeInput(input: string, successful = true): DecodedMessage | null {
  if (!successful || !/^0x(?:[0-9a-fA-F]{2})+$/.test(input)) return null;
  const bytes = Uint8Array.from(input.slice(2).match(/../g) ?? [], (part) => Number.parseInt(part, 16));
  let raw: string;
  try { raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return null; }
  if (controls.test(raw) || (raw.match(/\p{L}/gu)?.length ?? 0) < 2) return null;
  const tags: MessageTag[] = [];
  if (raw.startsWith('data:')) tags.push('ethscription');
  const text = raw.replace(hidden, (character) => { if (character) tags.push('hidden characters removed'); return ''; });
  return { text, tags: [...new Set(tags)], urls: text.match(URL_RE) ?? [] };
}
