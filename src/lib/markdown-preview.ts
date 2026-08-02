/**
 * Markdown -> sanitized HTML for the live preview pane.
 *
 * `marked` is already a dependency for the DOCX token walk, so the preview
 * reuses it rather than adding a second markdown implementation (two parsers
 * would eventually disagree, and the preview would stop predicting the .docx).
 */

import { marked } from "marked";
import { sanitizeHtml } from "./sanitize-html";

marked.setOptions({
  gfm: true, // tables, strikethrough, autolinks
  breaks: false, // a single newline is not a <br>, matching CommonMark
});

/**
 * Render markdown to HTML safe for `innerHTML`.
 *
 * Returns an empty string for empty input so callers can branch on falsiness
 * to show their placeholder state.
 */
export function renderMarkdownPreview(markdown: string): string {
  if (!markdown.trim()) return "";
  const html = marked.parse(markdown, { async: false });
  return sanitizeHtml(html);
}
