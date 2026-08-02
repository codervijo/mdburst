// @vitest-environment node
//
// src/__tests__/pdf-roundtrip.test.js
//
// Integration test over the real parser: hand-built PDF bytes -> pdf.js ->
// normalizePage() -> pdfPagesToMarkdown().
//
// The synthetic fixtures in pdf-to-markdown.test.js verify the heuristics given
// a correct page model. This file verifies the layer that *produces* that model:
// transform indices, glyph heights, resolved font names and annotation
// rectangles. A pdf.js upgrade that reshuffles those would leave the unit tests
// green while silently ruining real conversions, so this is the test that
// catches it.
//
// Runs in the node environment because pdf.js needs real Node APIs, not jsdom.

import { describe, it, expect, beforeAll } from 'vitest';
import { makeFixturePdf, FIXTURE_PAGE_COUNT } from './helpers/make-pdf.js';
import { normalizePage } from '../lib/pdf-extract.ts';
import { pdfPagesToMarkdown } from '../lib/pdf-to-markdown.ts';

let pages;
let result;

beforeAll(async () => {
  // The legacy build is the one pdf.js supports under Node (the modern build
  // reaches for DOMMatrix). The app itself imports the modern build, which is
  // correct for browsers — only this test needs the Node-compatible variant.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({
    data: makeFixturePdf(),
    useSystemFonts: true,
  }).promise;

  pages = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    pages.push(await normalizePage(await doc.getPage(n)));
  }
  result = pdfPagesToMarkdown(pages);
}, 30_000);

describe('normalizePage against a real PDF', () => {
  it('reads every page', () => {
    expect(pages).toHaveLength(FIXTURE_PAGE_COUNT);
  });

  it('reports the page box in user units', () => {
    expect(pages[0].width).toBeCloseTo(612, 0);
    expect(pages[0].height).toBeCloseTo(792, 0);
  });

  it('extracts positioned text items', () => {
    expect(pages[0].items.length).toBeGreaterThan(10);
    for (const item of pages[0].items) {
      expect(typeof item.str).toBe('string');
      expect(Number.isFinite(item.x)).toBe(true);
      expect(Number.isFinite(item.y)).toBe(true);
    }
  });

  it('derives glyph heights that match the authored font sizes', () => {
    const title = pages[0].items.find((i) => i.str.includes('Quarterly Revenue Report'));
    const body = pages[0].items.find((i) => i.str.includes('Revenue grew across'));
    expect(title.height).toBeCloseTo(24, 0);
    expect(body.height).toBeCloseTo(11, 0);
  });

  it('places text at the authored coordinates', () => {
    const title = pages[0].items.find((i) => i.str.includes('Quarterly Revenue Report'));
    expect(title.x).toBeCloseTo(72, 0);
    expect(title.y).toBeCloseTo(720, 0);
  });

  it('resolves font ids to a descriptor, never the raw pdf.js internal id', () => {
    // pdf.js hands back ids like "g_d0_f5" and only fills commonObjs once the
    // operator list has been processed. normalizePage must fall back to the
    // styles map so the mono heuristic still has something to match on.
    for (const item of pages[0].items) {
      expect(item.fontName).not.toMatch(/^g_d\d+_f\d+$/);
    }
  });

  it('identifies the monospaced font so code blocks can be detected', () => {
    const code = pages[0].items.find((i) => i.str.includes('total = north'));
    expect(code.fontName.toLowerCase()).toMatch(/mono|courier/);

    const prose = pages[0].items.find((i) => i.str.includes('Revenue grew across'));
    expect(prose.fontName.toLowerCase()).not.toMatch(/mono|courier/);
  });

  it('extracts link annotations with their URL and rectangle', () => {
    expect(pages[0].links).toHaveLength(1);
    const [link] = pages[0].links;
    expect(link.url).toBe('https://example.com/methodology');
    expect(link.x).toBeCloseTo(72, 0);
    expect(link.width).toBeCloseTo(98, 0);
  });

  it('finds no annotations on pages that have none', () => {
    expect(pages[1].links).toHaveLength(0);
  });
});

describe('end-to-end markdown from a real PDF', () => {
  it('infers the heading hierarchy from font size', () => {
    expect(result.markdown).toContain('# Quarterly Revenue Report');
    expect(result.markdown).toContain('## Regional performance');
  });

  it('joins the wrapped body lines into one paragraph', () => {
    expect(result.markdown).toContain(
      'Revenue grew across all three regions in the period, with the strongest contribution from the northern territory.',
    );
  });

  it('converts bullet glyphs into list items', () => {
    expect(result.markdown).toContain('- North: ahead of plan');
    expect(result.markdown).toContain('- South: behind plan');
  });

  it('reconstructs the two-column grid as a table', () => {
    expect(result.markdown).toContain('| Region | Revenue |');
    expect(result.markdown).toContain('| --- | --- |');
    expect(result.markdown).toContain('| North | 412,000 |');
  });

  it('fences the monospaced line as code', () => {
    expect(result.markdown).toMatch(/```[\s\S]*total = north \+ central \+ south[\s\S]*```/);
  });

  it('applies the link annotation to the text it covers', () => {
    expect(result.markdown).toContain('](https://example.com/methodology)');
  });

  it('de-hyphenates a word broken across lines', () => {
    expect(result.markdown).toContain('international finance team');
    expect(result.markdown).not.toContain('inter- national');
  });

  it('strips the running footer and page numbers repeated on every page', () => {
    expect(result.markdown).not.toContain('ACME Confidential Report');
    expect(result.markdown).not.toMatch(/Page \d of 3/);
  });

  it('keeps content from later pages', () => {
    expect(result.markdown).toContain('Appendix');
    expect(result.markdown).toContain('Supporting detail follows');
  });

  it('reports stats consistent with the document', () => {
    expect(result.stats.pages).toBe(FIXTURE_PAGE_COUNT);
    expect(result.stats.headings).toBeGreaterThanOrEqual(2);
    expect(result.stats.listItems).toBe(3);
    expect(result.stats.tables).toBe(1);
    expect(result.stats.links).toBe(1);
  });

  it('does not warn about a missing text layer for a text-native PDF', () => {
    expect(result.warnings.join(' ')).not.toMatch(/no text layer/i);
  });
});
