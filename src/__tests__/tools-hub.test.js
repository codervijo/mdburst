// src/__tests__/tools-hub.test.js
//
// Checks for the /tools/ topical hub. The hub's job is to be worth reading on
// its own and to pass link equity to the two tool pages, so the assertions here
// are about substance (word count, distinct copy, working internal links) as
// much as about markup.
//
// Built-HTML assertions are skipped when dist/ is absent; `make test` builds
// first, so they run in the project's normal pipeline.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { TOOLS, HUB_FAQS } from '../data/tools.ts';
import { faqSchemaFromEntries } from '../lib/schema.ts';

const root = process.cwd();
const source = readFileSync(join(root, 'src', 'pages', 'tools', 'index.astro'), 'utf8');

const REQUIRED_SECTIONS = [
  'intro',
  'tools',
  'comparison',
  'why',
  'workflows',
  'choosing',
  'privacy',
  'faq',
  'related-guides',
];

describe('hub registry fields', () => {
  it('gives every tool the fields the cards and table render', () => {
    for (const tool of TOOLS) {
      expect(tool.input.length).toBeGreaterThan(5);
      expect(tool.output.length).toBeGreaterThan(5);
      expect(tool.bestFor.length).toBeGreaterThan(20);
      expect(tool.mainLimitation.length).toBeGreaterThan(20);
      expect(tool.privacyNote.length).toBeGreaterThan(20);
      expect(tool.ctaLabel.length).toBeGreaterThan(3);
      expect(tool.keyFeatures.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('describes each tool distinctly — no shared boilerplate', () => {
    const [a, b] = TOOLS;
    expect(a.bestFor).not.toBe(b.bestFor);
    expect(a.mainLimitation).not.toBe(b.mainLimitation);
    expect(a.input).not.toBe(b.input);
    expect(a.output).not.toBe(b.output);
  });
});

describe('hub FAQ', () => {
  it('asks cross-tool questions, not copies of the tool-page FAQs', () => {
    const toolQuestions = new Set(TOOLS.flatMap((t) => t.faqs.map((f) => f.question)));
    for (const faq of HUB_FAQS) {
      expect(toolQuestions.has(faq.question)).toBe(false);
    }
  });

  it('answers substantively', () => {
    expect(HUB_FAQS.length).toBeGreaterThanOrEqual(4);
    for (const faq of HUB_FAQS) {
      expect(faq.question).toMatch(/\?$/);
      expect(faq.answer.length).toBeGreaterThan(120);
    }
  });

  it('produces FAQPage schema mirroring the entries exactly', () => {
    const schema = faqSchemaFromEntries(HUB_FAQS);
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(HUB_FAQS.length);
    schema.mainEntity.forEach((entity, index) => {
      expect(entity.name).toBe(HUB_FAQS[index].question);
      expect(entity.acceptedAnswer.text).toBe(HUB_FAQS[index].answer);
    });
  });
});

describe('hub source', () => {
  it('has every required section', () => {
    for (const id of REQUIRED_SECTIONS.filter((s) => s !== 'faq')) {
      expect(source).toContain(`id="${id}"`);
    }
    expect(source).toContain('<Faq faqs={HUB_FAQS} />');
  });

  it('targets both hub keywords in the H1', () => {
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(source)[1].toLowerCase();
    expect(h1).toContain('markdown tools');
    expect(h1).toContain('online markdown converters');
  });

  it('renders cards and the comparison table from the registry', () => {
    expect(source).toContain('TOOLS.map');
    expect(source).toContain('tool.keyFeatures.map');
    expect(source).toContain('tool.mainLimitation');
  });

  it('emits ItemList and FAQPage schema', () => {
    expect(source).toContain('toolListSchema(TOOLS)');
    expect(source).toContain('faqSchemaFromEntries(HUB_FAQS)');
  });
});

const distFile = join(root, 'dist', 'tools', 'index.html');

describe.skipIf(!existsSync(distFile))('hub built HTML', () => {
  const html = readFileSync(distFile, 'utf8');

  const visibleText = (input) =>
    input
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');

  const jsonLd = [...html.matchAll(/application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) =>
    JSON.parse(m[1]),
  );

  /** Page copy only — nav, breadcrumbs and footer are chrome, not content. */
  const mainText = () => {
    const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(html);
    expect(main, '<main> landmark missing').not.toBeNull();
    return visibleText(main[1]);
  };

  it('publishes 700–1200 words of copy in the main landmark', () => {
    const words = mainText().split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(700);
    expect(words).toBeLessThanOrEqual(1200);
  });

  it('has a unique title, description and canonical', () => {
    expect(html).toContain('<title>Markdown Tools – Free Online Markdown Converters | mdburst</title>');
    expect(html).toMatch(/<meta name="description" content="Free online Markdown converters/);
    expect(html).toContain('<link rel="canonical" href="https://mdburst.com/tools/"');
  });

  it('has Open Graph and Twitter metadata', () => {
    expect(html).toMatch(/property="og:title"/);
    expect(html).toMatch(/property="og:url" content="https:\/\/mdburst\.com\/tools\/"/);
    expect(html).toMatch(/property="og:description"/);
    expect(html).toMatch(/name="twitter:card"/);
  });

  it('emits BreadcrumbList, ItemList and FAQPage schema', () => {
    const types = jsonLd.map((g) => g['@type']);
    expect(types).toContain('BreadcrumbList');
    expect(types).toContain('ItemList');
    expect(types).toContain('FAQPage');
  });

  it('renders every FAQ in the schema visibly on the page', () => {
    const faq = jsonLd.find((g) => g['@type'] === 'FAQPage');
    const text = visibleText(html).replace(/\s+/g, ' ');
    for (const entity of faq.mainEntity) {
      expect(text).toContain(entity.name.replace(/\s+/g, ' '));
      expect(text).toContain(entity.acceptedAnswer.text.slice(0, 60).replace(/\s+/g, ' '));
    }
  });

  it('renders all required sections', () => {
    for (const id of REQUIRED_SECTIONS) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('has exactly one H1 covering both target phrases', () => {
    const headings = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
    expect(headings).toHaveLength(1);
    const text = headings[0][1].replace(/<[^>]+>/g, '').toLowerCase();
    expect(text).toContain('markdown tools');
    expect(text).toContain('online markdown converters');
  });

  it('links to both tool pages more than once (card, table, prose)', () => {
    for (const tool of TOOLS) {
      const count = html.split(`href="${tool.path}"`).length - 1;
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  it('shows each tool card with its features, limitation and CTA', () => {
    // Compared against decoded text: apostrophes are entity-encoded in the HTML.
    const text = visibleText(html).replace(/\s+/g, ' ');
    for (const tool of TOOLS) {
      expect(text).toContain(tool.ctaLabel);
      expect(text).toContain(tool.bestFor);
      expect(text).toContain(tool.mainLimitation);
      for (const feature of tool.keyFeatures) {
        expect(text).toContain(feature);
      }
    }
  });

  it('renders the comparison table with every documented row', () => {
    const text = visibleText(html).replace(/\s+/g, ' ');
    for (const label of ['Input', 'Output', 'Processed in browser', 'Best use case', 'Main limitation']) {
      expect(text).toContain(label);
    }
    for (const tool of TOOLS) {
      expect(text).toContain(tool.input);
      expect(text).toContain(tool.output);
    }
  });

  it('only links to pages that exist', () => {
    const realPages = new Set(['/', '/tools/', ...TOOLS.map((t) => t.path)]);
    const hrefs = [...html.matchAll(/href="(\/[^"#]*)(#[^"]*)?"/g)].map((m) => m[1]);

    for (const href of new Set(hrefs)) {
      // Static assets (favicon, images) are files in public/, not routes.
      if (/\.[a-z0-9]+$/i.test(href)) {
        expect(
          existsSync(join(root, 'dist', href.replace(/^\//, ''))),
          `missing static asset: ${href}`,
        ).toBe(true);
        continue;
      }
      expect(realPages.has(href), `unexpected internal link: ${href}`).toBe(true);
    }
  });

  it('resolves every in-page anchor it links to', () => {
    const anchors = [...html.matchAll(/href="(\/tools\/[^"]*)#([^"]+)"/g)];
    expect(anchors.length).toBeGreaterThan(0);

    for (const [, path, fragment] of anchors) {
      const target = readFileSync(join(root, 'dist', path.replace(/^\//, ''), 'index.html'), 'utf8');
      expect(target, `#${fragment} missing on ${path}`).toContain(`id="${fragment}"`);
    }
  });

  it('does not duplicate a tool-page FAQ answer verbatim', () => {
    const text = visibleText(html).replace(/\s+/g, ' ');
    for (const tool of TOOLS) {
      for (const faq of tool.faqs) {
        expect(text).not.toContain(faq.answer.slice(0, 80).replace(/\s+/g, ' '));
      }
    }
  });
});
