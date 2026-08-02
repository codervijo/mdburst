// src/__tests__/markdown-to-docx.test.js
//
// Unit tests for the Markdown -> DOCX mapping. These assert on the generated
// OOXML rather than on our own intermediate objects: a .docx is only useful if
// Word can open it, so we pack a real document and inspect word/document.xml.

import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import {
  markdownToDocx,
  MarkdownConversionError,
} from '../lib/markdown-to-docx.ts';

/** Pack a document and return word/document.xml as a string. */
async function documentXml(markdown) {
  const { doc } = markdownToDocx(markdown);
  const buffer = await Packer.toBuffer(doc);
  // A .docx is a zip; find the document.xml entry without adding a zip dep by
  // inflating through Node's zlib using the central-directory offsets.
  const { unzipEntry } = await import('./helpers/unzip.js');
  return unzipEntry(buffer, 'word/document.xml');
}

describe('markdownToDocx — package validity', () => {
  // Word rejects a .docx whose container is missing required parts, and that
  // failure only shows up when opening the file. These assertions stand in for
  // "does it actually open" without needing Word in the loop.
  it('produces a ZIP containing the parts an OOXML reader requires', async () => {
    const { doc } = markdownToDocx('# Title\n\n1. one\n\n| a | b |\n| --- | --- |\n| c | d |');
    const buffer = await Packer.toBuffer(doc);
    const { listEntries } = await import('./helpers/unzip.js');
    const entries = listEntries(buffer);

    expect(entries).toContain('[Content_Types].xml');
    expect(entries).toContain('_rels/.rels');
    expect(entries).toContain('word/document.xml');
    expect(entries).toContain('word/_rels/document.xml.rels');
    expect(entries).toContain('word/styles.xml');
    expect(entries).toContain('word/numbering.xml');
  });

  it('starts with the ZIP magic bytes', async () => {
    const { doc } = markdownToDocx('# Title');
    const buffer = await Packer.toBuffer(doc);
    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x4b); // K
  });

  it('declares the heading styles it references', async () => {
    const { doc } = markdownToDocx('# One\n\n## Two');
    const buffer = await Packer.toBuffer(doc);
    const { unzipEntry } = await import('./helpers/unzip.js');
    const styles = unzipEntry(buffer, 'word/styles.xml');
    expect(styles).toContain('Heading1');
    expect(styles).toContain('Heading2');
  });

  it('registers hyperlink relationships for external links', async () => {
    const { doc } = markdownToDocx('[docs](https://mdburst.com/tools/)');
    const buffer = await Packer.toBuffer(doc);
    const { unzipEntry } = await import('./helpers/unzip.js');
    const rels = unzipEntry(buffer, 'word/_rels/document.xml.rels');
    expect(rels).toContain('https://mdburst.com/tools/');
    expect(rels).toContain('hyperlink');
  });
});

describe('markdownToDocx — structure mapping', () => {
  it('maps ATX headings to real Word heading styles', async () => {
    const xml = await documentXml('# Title\n\n## Subtitle\n\n### Third');
    expect(xml).toContain('w:val="Heading1"');
    expect(xml).toContain('w:val="Heading2"');
    expect(xml).toContain('w:val="Heading3"');
    expect(xml).toContain('Title');
    expect(xml).toContain('Subtitle');
  });

  it('clamps heading depth to the six levels Word supports', () => {
    const { stats } = markdownToDocx('###### Six\n');
    expect(stats.headings).toBe(1);
  });

  it('emits paragraphs as separate w:p elements, not one blob', async () => {
    const xml = await documentXml('First para.\n\nSecond para.');
    const paragraphs = xml.match(/<w:p[ >]/g) ?? [];
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(xml).toContain('First para.');
    expect(xml).toContain('Second para.');
  });

  it('maps bold, italic and strikethrough to run properties', async () => {
    const xml = await documentXml('**bold** and *italic* and ~~struck~~');
    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('<w:i/>');
    expect(xml).toContain('<w:strike/>');
  });

  it('keeps nested emphasis from losing the outer mark', async () => {
    const xml = await documentXml('**bold _and italic_**');
    // The inner run must carry both marks.
    expect(xml).toMatch(/<w:b\/>[\s\S]{0,120}<w:i\/>/);
  });

  it('maps unordered lists to bullet numbering', async () => {
    const { stats } = markdownToDocx('- one\n- two\n- three');
    expect(stats.lists).toBe(1);
    expect(stats.listItems).toBe(3);
    const xml = await documentXml('- one\n- two\n- three');
    expect(xml).toContain('<w:numPr>');
  });

  it('maps ordered lists to the shared numbering definition', async () => {
    const xml = await documentXml('1. first\n2. second');
    expect(xml).toContain('<w:numPr>');
    expect(xml).toContain('<w:ilvl');
  });

  it('expresses nested lists via increasing levels', async () => {
    const md = '- top\n    - nested\n        - deeper';
    const { stats } = markdownToDocx(md);
    expect(stats.listItems).toBe(3);
    const xml = await documentXml(md);
    expect(xml).toContain('w:ilvl w:val="0"');
    expect(xml).toContain('w:ilvl w:val="1"');
  });

  it('maps tables to real w:tbl rows and cells with a header row', async () => {
    const md = [
      '| Format | Supported |',
      '| --- | --- |',
      '| Headings | Yes |',
      '| Tables | Yes |',
    ].join('\n');
    const { stats } = markdownToDocx(md);
    expect(stats.tables).toBe(1);

    const xml = await documentXml(md);
    expect(xml).toContain('<w:tbl>');
    expect(xml).toContain('<w:tr');
    expect(xml).toContain('<w:tc>');
    expect(xml).toContain('<w:tblHeader');
    expect(xml).toContain('Headings');
  });

  it('honours table column alignment', async () => {
    const md = ['| L | C | R |', '| :-- | :-: | --: |', '| a | b | c |'].join('\n');
    const xml = await documentXml(md);
    expect(xml).toContain('w:val="center"');
    expect(xml).toContain('w:val="right"');
  });

  it('preserves code block line breaks as separate paragraphs', async () => {
    const md = '```js\nconst a = 1;\nconst b = 2;\n```';
    const { stats } = markdownToDocx(md);
    expect(stats.codeBlocks).toBe(1);

    const xml = await documentXml(md);
    expect(xml).toContain('const a = 1;');
    expect(xml).toContain('const b = 2;');
    expect(xml).toContain('Consolas');
  });

  it('does not HTML-escape angle brackets inside code', async () => {
    const xml = await documentXml('```html\n<div class="x">hi</div>\n```');
    // Escaped for XML transport, but must not be double-encoded as &amp;lt;
    expect(xml).not.toContain('&amp;lt;');
  });

  it('maps links to external hyperlink relationships', async () => {
    const md = 'See [the docs](https://mdburst.com/tools/) for more.';
    const { stats } = markdownToDocx(md);
    expect(stats.links).toBe(1);
    const xml = await documentXml(md);
    expect(xml).toContain('<w:hyperlink');
    expect(xml).toContain('the docs');
  });

  it('falls back to the URL when a link has no text', () => {
    const { stats } = markdownToDocx('<https://mdburst.com/>');
    expect(stats.links).toBe(1);
  });

  it('maps blockquotes with an indent and a left rule', async () => {
    const { stats } = markdownToDocx('> quoted line');
    expect(stats.blockquotes).toBe(1);
    const xml = await documentXml('> quoted line');
    expect(xml).toContain('<w:ind');
    expect(xml).toContain('quoted line');
  });

  it('keeps structure inside a blockquote', () => {
    const { stats } = markdownToDocx('> - a\n> - b\n');
    expect(stats.blockquotes).toBe(1);
    expect(stats.listItems).toBe(2);
  });

  it('maps horizontal rules to a bordered paragraph', async () => {
    const { stats } = markdownToDocx('a\n\n---\n\nb');
    expect(stats.horizontalRules).toBe(1);
    const xml = await documentXml('a\n\n---\n\nb');
    expect(xml).toContain('<w:pBdr>');
  });

  it('preserves image alt text as a placeholder', () => {
    const { stats } = markdownToDocx('![a diagram](https://example.com/x.png)');
    expect(stats.images).toBe(1);
  });

  it('renders task list checkboxes', async () => {
    const xml = await documentXml('- [x] done\n- [ ] todo');
    expect(xml).toContain('done');
    expect(xml).toContain('todo');
  });
});

describe('markdownToDocx — Unicode and escaping', () => {
  it('round-trips non-Latin scripts and emoji', async () => {
    const md = '# 標題 — Ünïcødé\n\nमार्कडाउन テキスト 🚀 «guillemets»';
    const xml = await documentXml(md);
    expect(xml).toContain('標題');
    expect(xml).toContain('Ünïcødé');
    expect(xml).toContain('मार्कडाउन');
    expect(xml).toContain('テキスト');
    expect(xml).toContain('🚀');
  });

  it('decodes entities marked leaves in token text', async () => {
    const xml = await documentXml('AT&T "quoted" and 5 < 6');
    expect(xml).not.toContain('&amp;amp;');
  });

  it('preserves ampersands as valid XML', async () => {
    const xml = await documentXml('Tom & Jerry');
    expect(xml).toContain('Tom &amp; Jerry');
  });
});

describe('markdownToDocx — error handling', () => {
  it('rejects empty input with a typed error', () => {
    expect(() => markdownToDocx('')).toThrow(MarkdownConversionError);
    try {
      markdownToDocx('');
    } catch (error) {
      expect(error.code).toBe('empty_input');
      expect(error.message).toMatch(/nothing to convert/i);
    }
  });

  it('rejects whitespace-only input', () => {
    expect(() => markdownToDocx('   \n\n\t  ')).toThrow(MarkdownConversionError);
  });

  it('handles a large document without throwing', () => {
    const md = Array.from({ length: 2000 }, (_, i) => `## Section ${i}\n\nBody ${i}.`).join('\n\n');
    const { stats } = markdownToDocx(md);
    expect(stats.headings).toBe(2000);
    expect(stats.paragraphs).toBe(2000);
  });

  it('survives malformed / half-written markdown', () => {
    const md = '| broken | table\n| --- \n\n**unclosed bold\n\n```\nunclosed fence';
    expect(() => markdownToDocx(md)).not.toThrow();
  });
});
