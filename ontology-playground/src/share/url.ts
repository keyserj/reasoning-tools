import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";
import { z } from "zod";
import { LAYOUT_DIRECTIONS, type Ontology, type StyleConfig } from "../ontology/types.ts";
import { defaultOntologyId, ontologies } from "../ontology/registry.ts";

// The whole document lives in the URL hash so sharing needs no backend. We DEFLATE
// the JSON (fflate) then base64url-encode it, mirroring how mermaid.live keeps links short.
//
// A hash is untrusted input that ends up inside generated mermaid source, so it is
// validated on the way in. Every field carries a default, which is what keeps old and
// partial links working: anything missing or malformed degrades to the ontology's
// default rather than rejecting the document.

/** The shared document: the app's state and the thing encoded into the hash are the same. */
export interface DocState {
  ontologyId: string;
  source: string;
  config: StyleConfig;
}

const hexColor = z.string().regex(/^#[0-9a-fA-F]{3,8}$/);

const styleSchema = z.object({ fill: hexColor, stroke: hexColor, color: hexColor });

/** Ontology-independent outer shape; `config` is checked once its ontology is known. */
const envelopeSchema = z.object({
  ontologyId: z.string(),
  source: z.string(),
  config: z.unknown(),
});

/**
 * Built per ontology, since the valid node-type keys come from its own table. Unknown
 * keys are dropped by zod; known-but-malformed ones fall back to that type's default.
 */
const configSchema = (ontology: Ontology) =>
  z.object({
    direction: z.enum(LAYOUT_DIRECTIONS).catch(ontology.defaultConfig.direction),
    showIcons: z.boolean().catch(ontology.defaultConfig.showIcons),
    types: z
      .object(
        Object.fromEntries(
          ontology.renderedNodeTypes.map((t) => [t.id, styleSchema.catch(t.defaultStyle)]),
        ),
      )
      .catch(ontology.defaultConfig.types),
  });

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

export function encodeState(state: DocState): string {
  const json = JSON.stringify(state);
  const deflated = deflateSync(strToU8(json));
  return bytesToBase64Url(deflated);
}

/**
 * Decode a hash into a valid document, or null if there is nothing decodable there.
 * A link naming an unknown ontology falls back to the default ontology's own sample:
 * reinterpreting one ontology's syntax as another's would only produce a wall of parse errors.
 */
export function decodeState(encoded: string): DocState | null {
  let raw: unknown;
  try {
    const trimmed = encoded.replace(/^#/, "");
    if (!trimmed) return null;
    raw = JSON.parse(strFromU8(inflateSync(base64UrlToBytes(trimmed))));
  } catch {
    return null;
  }

  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success) return null;

  const known = ontologies[envelope.data.ontologyId];
  const ontology = known ?? ontologies[defaultOntologyId];
  const source = known ? envelope.data.source : ontology.sample;

  const config = configSchema(ontology).safeParse(envelope.data.config);

  return {
    ontologyId: ontology.id,
    source,
    config: config.success ? config.data : structuredClone(ontology.defaultConfig),
  };
}

export function buildShareUrl(state: DocState): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${encodeState(state)}`;
}
