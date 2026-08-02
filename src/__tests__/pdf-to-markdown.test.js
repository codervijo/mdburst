// src/__tests__/pdf-to-markdown.test.js
//
// Unit tests for the PDF-layout -> Markdown inference. The converter takes a
// normalized page model rather than a real PDF, so these fixtures place text at
// explicit coordinates — which is what lets us test heading inference, column
// detection and running-head removal deterministically.
//
// PDF coordinates: origin bottom-left, y grows upward. Fixtures therefore lay
// lines out top-down by *decreasing* y.

import { describe, it, expect } from 'vitest';
import { pdfPagesToMarkdown } from '../lib/pdf-to-markdown.ts';

const BODY = 12;
const PAGE_HEIGHT = 792;
const PAGE_WIDTH = 612;

/** Approximate advance width so fixtures produce believable geometry. */
const widthOf = (text, size) => text.length * size * 0.5;

/** One text item at (x, y). */
function item(str, { x = 72, y = 700, size = BODY, font = 'Helvetica' } = {}) {
  return { str, x, y, width: widthOf(str, size), height: size, fontName: font };
}

/**
 * Lay out a list of line descriptors top-down, 18pt apart by default.
 * Each entry: { text | cells, size, font, gap (extra leading), x }
 */
function layout(entries, { startY = 720, leading = 18, x = 72 } = {}) {
  const items = [];
  let y = startY;
  for (const entry of entries) {
    const size = entry.size ?? BODY;
    y -= entry.gap ?? 0;
    if (entry.cells) {
      for (const cell of entry.cells) {
        items.push(item(cell.text, { x: cell.x, y, size, font: entry.font }));
      }
    } else {
      items.push(item(entry.text, { x: entry.x ?? x, y, size, font: entry.font }));
    }
    y -= Math.max(leading, size * 1.4);
  }
  return items;
}

const page = (items, links = []) => ({
  width: PAGE_WIDTH,
  height: PAGE_HEIGHT,
  items,
  links,
});

describe('pdfPagesToMarkdown — headings', () => {
  it('infers heading levels from relative font size, largest first', () => {
    const { markdown, stats } = pdfPagesToMarkdown([
      page(
        layout([
          { text: 'Quarterly Report', size: 24 },
          { text: 'Revenue', size: 18 },
          { text: 'Ordinary body copy that runs on for a while.', size: BODY },
          { text: 'Costs', size: 18 },
          { text: 'More ordinary body copy sitting under the heading.', size: BODY },
        ]),
      ),
    ]);

    expect(markdown).toContain('# Quarterly Report');
    expect(markdown).toContain('## Revenue');
    expect(markdown).toContain('## Costs');
    expect(stats.headings).toBe(3);
  });

  it('does not promote body text that merely ends a sentence', () => {
    const { markdown } = pdfPagesToMarkdown([
      page(
        layout([
          { text: 'This is a normal sentence of body text.', size: BODY },
          { text: 'So is this one, sitting right below it.', size: BODY },
        ]),
      ),
    ]);
    expect(markdown).not.toMatch(/^#/m);
  });

  it('treats a large line ending in a colon as body, not a heading', () => {
    const { markdown } = pdfPagesToMarkdown([
      page(
        layout([
          { text: 'Note the following:', size: 18 },
          { text: 'Body text under it.', size: BODY },
        ]),
      ),
    ]);
    expect(markdown).not.toContain('# Note the following:');
  });
});

describe('pdfPagesToMarkdown — paragraphs', () => {
  it('joins wrapped lines into one paragraph', () => {
    const { markdown, stats } = pdfPagesToMarkdown([
      page(
        layout([
          { text: 'The quick brown fox jumps over the lazy dog and' },
          { text: 'continues onto a second line of the same paragraph.' },
        ]),
      ),
    ]);

    expect(stats.paragraphs).toBe(1);
    expect(markdown.trim()).toBe(
      'The quick brown fox jumps over the lazy dog and continues onto a second line of the same paragraph.',
    );
  });

  it('splits paragraphs on a wide vertical gap', () => {
    const { stats } = pdfPagesToMarkdown([
      page(
        layout([
          { text: 'First paragraph line one.' },
          { text: 'Second paragraph starts here.', gap: 26 },
        ]),
      ),
    ]);
    expect(stats.paragraphs).toBe(2);
  });

  it('de-hyphenates a word broken across lines', () => {
    const { markdown } = pdfPagesToMarkdown([
      page(
        layout([
          { text: 'This sentence contains a hyphen-' },
          { text: 'ated word split across lines.' },
        ]),
      ),
    ]);
    expect(markdown).toContain('hyphenated word');
    expect(markdown).not.toContain('hyphen- ated');
  });
});

describe('pdfPagesToMarkdown — lists', () => {
  it('converts bullet glyphs to markdown list items', () => {
    const { markdown, stats } = pdfPagesToMarkdown([
      page(
        layout([
          { text: '• First item' },
          { text: '• Second item' },
          { text: '• Third item' },
        ]),
      ),
    ]);

    expect(stats.listItems).toBe(3);
    expect(markdown).toContain('- First item');
    expect(markdown).toContain('- Third item');
  });

  it('converts numbered lists and keeps their numbers', () => {
    const { markdown, stats } = pdfPagesToMarkdown([
      page(layout([{ text: '1. Step one' }, { text: '2. Step two' }])),
    ]);
    expect(stats.listItems).toBe(2);
    expect(markdown).toContain('1. Step one');
    expect(markdown).toContain('2. Step two');
  });

  it('infers nesting from left indentation', () => {
    const { markdown } = pdfPagesToMarkdown([
      page(
        layout([
          { text: '• Top level', x: 72 },
          { text: '• Nested under it', x: 108 },
        ]),
      ),
    ]);
    expect(markdown).toMatch(/^- Top level$/m);
    expect(markdown).toMatch(/^ {2}- Nested under it$/m);
  });

  it('handles hyphen bullets without swallowing ordinary hyphenated prose', () => {
    const { stats } = pdfPagesToMarkdown([
      page(layout([{ text: 'A well-known example of prose text here.' }])),
    ]);
    expect(stats.listItems).toBe(0);
  });
});

describe('pdfPagesToMarkdown — tables', () => {
  it('reconstructs a table from aligned column positions', () => {
    const { markdown, stats } = pdfPagesToMarkdown([
      page(
        layout([
          { cells: [{ text: 'Format', x: 72 }, { text: 'Supported', x: 300 }], font: 'Helvetica-Bold' },
          { cells: [{ text: 'Headings', x: 72 }, { text: 'Yes', x: 300 }] },
          { cells: [{ text: 'Tables', x: 72 }, { text: 'Partial', x: 300 }] },
        ]),
      ),
    ]);

    expect(stats.tables).toBe(1);
    expect(markdown).toContain('| Format | Supported |');
    expect(markdown).toContain('| --- | --- |');
    expect(markdown).toContain('| Headings | Yes |');
    expect(markdown).toContain('| Tables | Partial |');
  });

  it('escapes pipe characters inside cells', () => {
    const { markdown } = pdfPagesToMarkdown([
      page(
        layout([
          { cells: [{ text: 'A|B', x: 72 }, { text: 'C', x: 300 }] },
          { cells: [{ text: 'D', x: 72 }, { text: 'E', x: 300 }] },
        ]),
      ),
    ]);
    expect(markdown).toContain('A\\|B');
  });

  it('does not turn two misaligned lines into a table', () => {
    const { stats } = pdfPagesToMarkdown([
      page(
        layout([
          { cells: [{ text: 'Left', x: 72 }, { text: 'Right', x: 300 }] },
          { cells: [{ text: 'Left', x: 72 }, { text: 'Shifted', x: 420 }] },
        ]),
      ),
    ]);
    expect(stats.tables).toBe(0);
  });

  it('requires at least two rows before committing to a table', () => {
    const { stats } = pdfPagesToMarkdown([
      page(
        layout([
          { cells: [{ text: 'Alone', x: 72 }, { text: 'Row', x: 300 }] },
          { text: 'A following paragraph of ordinary prose.', gap: 24 },
        ]),
      ),
    ]);
    expect(stats.tables).toBe(0);
  });
});

describe('pdfPagesToMarkdown — code blocks', () => {
  it('fences monospaced runs and preserves their lines', () => {
    const { markdown, stats } = pdfPagesToMarkdown([
      page(
        layout([
          { text: 'const a = 1;', font: 'Courier' },
          { text: 'const b = 2;', font: 'Courier' },
        ]),
      ),
    ]);

    expect(stats.codeBlocks).toBe(1);
    expect(markdown).toContain('```');
    expect(markdown).toContain('const a = 1;');
    expect(markdown).toContain('const b = 2;');
  });

  it('closes the fence when prose resumes', () => {
    const { markdown } = pdfPagesToMarkdown([
      page(
        layout([
          { text: 'run();', font: 'DejaVuSansMono' },
          { text: 'Back to normal prose text here.', font: 'Helvetica' },
        ]),
      ),
    ]);
    const fences = markdown.match(/```/g) ?? [];
    expect(fences.length).toBe(2);
  });
});

describe('pdfPagesToMarkdown — links', () => {
  it('wraps text covered by a link annotation', () => {
    const items = layout([{ text: 'Read the docs today' }]);
    const target = items[0];
    const { markdown, stats } = pdfPagesToMarkdown([
      page(items, [
        {
          url: 'https://mdburst.com/tools/',
          x: target.x,
          y: target.y,
          width: target.width,
          height: target.height,
        },
      ]),
    ]);

    expect(markdown).toContain('](https://mdburst.com/tools/)');
    expect(stats.links).toBe(1);
  });

  it('autolinks bare URLs found in the text', () => {
    const { markdown, stats } = pdfPagesToMarkdown([
      page(layout([{ text: 'See https://mdburst.com/tools/pdf-to-markdown/ for details' }])),
    ]);
    expect(markdown).toContain('<https://mdburst.com/tools/pdf-to-markdown/>');
    expect(stats.links).toBe(1);
  });

  it('does not corrupt underscores inside a URL by escaping them', () => {
    const { markdown } = pdfPagesToMarkdown([
      page(layout([{ text: 'Visit https://example.com/a_b_c now' }])),
    ]);
    expect(markdown).toContain('https://example.com/a_b_c');
    expect(markdown).not.toContain('a\\_b');
  });
});

describe('pdfPagesToMarkdown — escaping and Unicode', () => {
  it('escapes markdown control characters in prose', () => {
    const { markdown } = pdfPagesToMarkdown([
      page(layout([{ text: 'Use *stars* and _underscores_ literally' }])),
    ]);
    expect(markdown).toContain('\\*stars\\*');
    expect(markdown).toContain('\\_underscores\\_');
  });

  it('escapes a leading hash so body text is not promoted to a heading', () => {
    const { markdown } = pdfPagesToMarkdown([
      page(layout([{ text: '#hashtag opening a line of prose' }])),
    ]);
    expect(markdown).toContain('\\#hashtag');
  });

  it('preserves non-Latin scripts and emoji', () => {
    const { markdown } = pdfPagesToMarkdown([
      page(
        layout([
          { text: '見出しのテキスト', size: 20 },
          { text: 'Ünïcødé — मार्कडाउन 🚀 «guillemets»' },
        ]),
      ),
    ]);
    expect(markdown).toContain('見出しのテキスト');
    expect(markdown).toContain('मार्कडाउन');
    expect(markdown).toContain('🚀');
    expect(markdown).toContain('«guillemets»');
  });
});

describe('pdfPagesToMarkdown — running heads', () => {
  it('drops headers and footers repeated across pages', () => {
    const makePage = (n) =>
      page([
        item('ACME Confidential Report', { y: 760, size: 9 }),
        ...layout([{ text: `Body content for page ${n} goes here.` }], { startY: 700 }),
        item(`Page ${n} of 4`, { y: 30, size: 9 }),
      ]);

    const { markdown } = pdfPagesToMarkdown([makePage(1), makePage(2), makePage(3), makePage(4)]);

    expect(markdown).not.toContain('ACME Confidential Report');
    expect(markdown).not.toContain('Page 1 of 4');
    expect(markdown).toContain('Body content for page 1');
    expect(markdown).toContain('Body content for page 4');
  });

  it('drops bare page numbers even in a short document', () => {
    const makePage = (n) =>
      page([
        ...layout([{ text: `Content ${n}.` }], { startY: 700 }),
        item(String(n), { y: 28, size: 9 }),
      ]);
    const { markdown } = pdfPagesToMarkdown([makePage(1), makePage(2)]);
    expect(markdown).not.toMatch(/^2$/m);
  });

  it('keeps a repeated phrase that appears in body copy, not the margin', () => {
    const makePage = (n) =>
      page(layout([{ text: 'Terms and conditions apply.' }, { text: `Detail ${n}.` }], { startY: 500 }));
    const { markdown } = pdfPagesToMarkdown([makePage(1), makePage(2), makePage(3)]);
    expect(markdown).toContain('Terms and conditions apply.');
  });
});

describe('pdfPagesToMarkdown — degenerate input', () => {
  it('warns clearly when the PDF has no text layer at all', () => {
    const { markdown, warnings, stats } = pdfPagesToMarkdown([page([]), page([])]);
    expect(markdown).toBe('');
    expect(stats.characters).toBe(0);
    expect(warnings.join(' ')).toMatch(/no text layer/i);
    expect(warnings.join(' ')).toMatch(/OCR/i);
  });

  it('warns when the text layer is present but nearly empty', () => {
    const { warnings } = pdfPagesToMarkdown([
      page(layout([{ text: 'ii' }])),
      page(layout([{ text: 'iii' }])),
      page([]),
    ]);
    expect(warnings.join(' ')).toMatch(/mostly scanned/i);
  });

  it('accepts an empty page array without throwing', () => {
    const result = pdfPagesToMarkdown([]);
    expect(result.markdown).toBe('');
    expect(result.stats.pages).toBe(0);
  });

  it('ignores whitespace-only text items', () => {
    const { markdown } = pdfPagesToMarkdown([
      page([item('   ', { y: 700 }), item('Real content.', { y: 670 })]),
    ]);
    expect(markdown.trim()).toBe('Real content.');
  });

  it('handles a large document within a reasonable time', () => {
    const pages = Array.from({ length: 120 }, (_, p) =>
      page(
        layout(
          Array.from({ length: 40 }, (_, l) => ({ text: `Page ${p} line ${l} of body text.` })),
          { startY: 740 },
        ),
      ),
    );

    const started = Date.now();
    const { stats } = pdfPagesToMarkdown(pages);
    expect(stats.pages).toBe(120);
    expect(stats.characters).toBeGreaterThan(10_000);
    expect(Date.now() - started).toBeLessThan(10_000);
  });

  it('emits a warning whenever a table was inferred', () => {
    const { warnings } = pdfPagesToMarkdown([
      page(
        layout([
          { cells: [{ text: 'A', x: 72 }, { text: 'B', x: 300 }] },
          { cells: [{ text: 'C', x: 72 }, { text: 'D', x: 300 }] },
        ]),
      ),
    ]);
    expect(warnings.join(' ')).toMatch(/reconstructed from column positions/i);
  });
});
