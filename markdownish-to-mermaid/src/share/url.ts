import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";
import type { StyleConfig } from "../ontology/types.ts";

// The whole document lives in the URL hash so sharing needs no backend. We DEFLATE
// the JSON (fflate) then base64url-encode it, mirroring how mermaid.live keeps links short.

export interface ShareState {
  ontologyId: string;
  source: string;
  config: StyleConfig;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeState(state: ShareState): string {
  const json = JSON.stringify(state);
  const deflated = deflateSync(strToU8(json));
  return bytesToBase64Url(deflated);
}

export function decodeState(encoded: string): ShareState | null {
  try {
    const trimmed = encoded.replace(/^#/, "");
    if (!trimmed) return null;
    const bytes = base64UrlToBytes(trimmed);
    const json = strFromU8(inflateSync(bytes));
    const parsed: unknown = JSON.parse(json);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as ShareState).source === "string" &&
      typeof (parsed as ShareState).ontologyId === "string"
    ) {
      return parsed as ShareState;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(state: ShareState): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${encodeState(state)}`;
}
