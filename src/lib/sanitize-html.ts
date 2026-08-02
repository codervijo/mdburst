/**
 * Minimal allowlist HTML sanitizer for the markdown live preview.
 *
 * Markdown permits raw HTML passthrough, and the preview renders whatever the
 * user pastes. The blast radius is self-XSS only (the user's own browser, their
 * own input, no credentials on this static site), but rendering unfiltered
 * markup is still wrong — a pasted draft could carry a tracking pixel or an
 * iframe the user never intended to load.
 *
 * We parse into an inert document and walk it, dropping any element or
 * attribute not on the allowlist. Chosen over pulling in DOMPurify because the
 * surface here is small, fixed, and directly testable — see
 * src/__tests__/sanitize-html.test.js.
 */

const ALLOWED_TAGS = new Set([
  "a", "blockquote", "br", "code", "del", "em", "h1", "h2", "h3", "h4", "h5",
  "h6", "hr", "img", "li", "ol", "p", "pre", "s", "strong", "sub", "sup",
  "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul", "span", "div",
]);

/** Attributes allowed on every element, plus the per-tag extras below. */
const GLOBAL_ATTRS = new Set(["class", "title", "dir", "lang"]);

const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height"]),
  td: new Set(["colspan", "rowspan", "align"]),
  th: new Set(["colspan", "rowspan", "align", "scope"]),
  ol: new Set(["start"]),
};

/** URL schemes we let through in href/src. Everything else is dropped. */
const SAFE_URL = /^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i;

/** Control chars used to smuggle payloads such as a newline inside "javascript:". */
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

/** Elements whose *contents* are dropped too — keeping the text of a
 *  <script> would dump JS source into the preview. */
const DROP_WITH_CONTENT = new Set([
  "script", "style", "iframe", "object", "embed", "link", "meta", "base",
  "form", "input", "button", "select", "textarea", "noscript", "template",
  "svg", "math",
]);

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return false;
  if (CONTROL_CHARS.test(trimmed)) return false;
  return SAFE_URL.test(trimmed);
}

function scrubElement(el: Element): void {
  const tag = el.tagName.toLowerCase();
  const allowedForTag = TAG_ATTRS[tag];

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();

    // Event handlers and anything namespaced (xlink:href, xmlns) go first.
    if (name.startsWith("on") || name.includes(":")) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (!GLOBAL_ATTRS.has(name) && !allowedForTag?.has(name)) {
      el.removeAttribute(attr.name);
      continue;
    }
    if ((name === "href" || name === "src") && !isSafeUrl(attr.value)) {
      el.removeAttribute(attr.name);
    }
  }

  // External links open safely; rel guards against reverse-tabnabbing.
  if (tag === "a" && el.getAttribute("target") === "_blank") {
    el.setAttribute("rel", "noopener noreferrer");
  }
}

/**
 * Strip disallowed markup from an HTML string.
 *
 * Disallowed elements are unwrapped (their text content survives) unless they
 * are in DROP_WITH_CONTENT, in which case the whole subtree is removed.
 */
export function sanitizeHtml(html: string): string {
  if (typeof DOMParser === "undefined") {
    // Server-side / no-DOM fallback: the preview is client-only, so rendering
    // nothing is the safe answer — never pass raw markup through untouched.
    return "";
  }

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");

  // Snapshot the tree first: it is mutated as we walk.
  for (const el of Array.from(doc.body.querySelectorAll("*"))) {
    // May already be gone as part of an ancestor that was removed.
    if (!el.isConnected) continue;

    const tag = el.tagName.toLowerCase();

    if (DROP_WITH_CONTENT.has(tag)) {
      el.remove();
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }
    scrubElement(el);
  }

  return doc.body.innerHTML;
}
