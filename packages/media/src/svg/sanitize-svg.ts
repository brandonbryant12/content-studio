import { parseDocument } from 'htmlparser2';

const MAX_SVG_BYTES = 500 * 1024;

const ALLOWED_ELEMENTS = new Set(
  [
    'svg',
    'g',
    'path',
    'rect',
    'circle',
    'ellipse',
    'line',
    'polyline',
    'polygon',
    'text',
    'tspan',
    'textPath',
    'defs',
    'clipPath',
    'mask',
    'pattern',
    'linearGradient',
    'radialGradient',
    'stop',
    'use',
    'symbol',
    'title',
    'desc',
    'marker',
    'filter',
    'feGaussianBlur',
    'feOffset',
    'feMerge',
    'feMergeNode',
    'feBlend',
    'feColorMatrix',
    'feComposite',
    'feFlood',
    'image',
  ].map((name) => name.toLowerCase()),
);

const BLOCKED_ELEMENTS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
]);

const HREF_ATTRIBUTES = new Set(['href', 'xlink:href']);

const encoder = new TextEncoder();

interface SvgNode {
  readonly type: string;
  readonly data?: string;
  readonly name?: string;
  readonly attribs?: Record<string, string>;
  readonly children?: readonly SvgNode[];
}

interface SvgElement extends SvgNode {
  readonly type: 'tag';
  readonly name: string;
  readonly attribs: Record<string, string>;
  readonly children: readonly SvgNode[];
}

const getBytes = (value: string) => encoder.encode(value).byteLength;

const escapeText = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const escapeAttribute = (value: string) =>
  escapeText(value).replaceAll('"', '&quot;').replaceAll("'", '&apos;');

const stripQuotes = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length < 2) return trimmed;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const isAllowedReference = (value: string) => {
  const ref = value.trim();
  if (!ref) return false;
  if (ref.startsWith('#')) return true;
  return ref.toLowerCase().startsWith('data:');
};

const styleContainsDisallowedUrl = (style: string) => {
  const lower = style.toLowerCase();
  let index = 0;

  while (index < lower.length) {
    const start = lower.indexOf('url(', index);
    if (start === -1) return false;

    let cursor = start + 4;
    let depth = 1;
    while (cursor < style.length && depth > 0) {
      const char = style[cursor];
      if (char === '(') depth += 1;
      if (char === ')') depth -= 1;
      cursor += 1;
    }

    if (depth !== 0) return true;

    const token = style.slice(start + 4, cursor - 1);
    const reference = stripQuotes(token);
    if (!isAllowedReference(reference)) return true;

    index = cursor;
  }

  return false;
};

const sanitizeAttributes = (element: SvgElement) => {
  const entries = Object.entries(element.attribs ?? {});
  const safeAttributes: Array<readonly [string, string]> = [];

  for (const [name, value] of entries) {
    const normalized = name.toLowerCase();

    if (normalized.startsWith('on')) {
      continue;
    }

    if (HREF_ATTRIBUTES.has(normalized) && !isAllowedReference(value)) {
      continue;
    }

    if (normalized === 'style' && styleContainsDisallowedUrl(value)) {
      continue;
    }

    safeAttributes.push([name, value]);
  }

  return safeAttributes;
};

const isTagNode = (node: SvgNode): node is SvgElement =>
  node.type === 'tag' &&
  typeof node.name === 'string' &&
  typeof node.attribs === 'object' &&
  node.attribs !== null &&
  Array.isArray(node.children);

const isTextNode = (node: SvgNode): node is SvgNode & { data: string } =>
  node.type === 'text' && typeof node.data === 'string';

const isWhitespaceText = (node: SvgNode) =>
  isTextNode(node) && node.data.trim().length === 0;

const sanitizeNode = (node: SvgNode): string | null => {
  if (isTagNode(node)) {
    const normalizedName = node.name.toLowerCase();
    if (BLOCKED_ELEMENTS.has(normalizedName)) return null;
    if (!ALLOWED_ELEMENTS.has(normalizedName)) return null;

    const attrs = sanitizeAttributes(node)
      .map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`)
      .join('');

    const content = node.children
      .map((child) => sanitizeNode(child))
      .filter((value): value is string => value !== null)
      .join('');

    if (content.length === 0) {
      return `<${node.name}${attrs}/>`;
    }

    return `<${node.name}${attrs}>${content}</${node.name}>`;
  }

  if (isTextNode(node)) {
    return escapeText(node.data);
  }

  return null;
};

const findSvgRoot = (nodes: readonly SvgNode[]) => {
  for (const node of nodes) {
    if (isWhitespaceText(node) || node.type === 'directive') {
      continue;
    }

    if (!isTagNode(node)) {
      return null;
    }

    return node.name.toLowerCase() === 'svg' ? node : null;
  }

  return null;
};

export function extractSvgBlock(text: string): string | null {
  const lower = text.toLowerCase();
  const start = lower.indexOf('<svg');
  if (start === -1) return null;

  const end = lower.indexOf('</svg>', start);
  if (end === -1) return null;

  return text.slice(start, end + 6);
}

export function sanitizeSvg(raw: string): string | null {
  if (getBytes(raw) > MAX_SVG_BYTES) return null;

  let parsed: { children: readonly SvgNode[] };
  try {
    parsed = parseDocument(raw, {
      xmlMode: true,
      lowerCaseTags: false,
      lowerCaseAttributeNames: false,
      recognizeSelfClosing: true,
      decodeEntities: false,
    }) as { children: readonly SvgNode[] };
  } catch {
    return null;
  }

  const svgRoot = findSvgRoot(parsed.children);

  if (!svgRoot) return null;

  const sanitized = sanitizeNode(svgRoot);
  if (!sanitized) return null;

  if (getBytes(sanitized) > MAX_SVG_BYTES) return null;
  return sanitized;
}
