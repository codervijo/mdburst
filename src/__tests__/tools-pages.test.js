// src/__tests__/tools-pages.test.js
//
// Page-level checks in two layers:
//
//  1. Source assertions on the .astro files — always run. These catch a page
//     losing its island, a required section, or its keyword placement.
//  2. Integration assertions on the built HTML in dist/ — run when a build is
//     present. `make test` builds before testing (pnpm install + build + test),
//     so these run in the project's normal pipeline; a bare `pnpm test` on a
//     clean checkout skips them rather than failing on a missing dist/.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { TOOLS } from '../data/tools.ts';

const root = process.cwd();

/** Every section the finished page must expose, checked against built HTML. */
const REQUIRED_SECTIONS = [
  'converter',
  'how-it-works',
  'supported-formatting',
  'example',
  'privacy',
  'limitations',
  'faq',
  'related-tools',
];

/** The subset authored directly in the page; `faq` and `related-tools` are
 *  rendered by shared components, so the source is checked for those instead. */
const INLINE_SECTIONS = REQUIRED_SECTIONS.filter(
  (id) => id !== 'faq' && id !== 'related-tools',
);

const pageSource = (slug) =>
  readFileSync(join(root, 'src', 'pages', 'tools', `${slug}.astro`), 'utf8');

describe.each(TOOLS.map((tool) => [tool.slug, tool]))('source: %s', (slug, tool) => {
  const source = pageSource(slug);

  it('renders through ToolLayout with the tool definition', () => {
    expect(source).toContain('ToolLayout');
    expect(source).toContain(`getTool("${slug}")`);
  });

  it('passes WebApplication and FAQPage schema to the layout', () => {
    expect(source).toContain('webApplicationSchema(tool)');
    expect(source).toContain('faqPageSchema(tool)');
  });

  it('renders the visible FAQ from the same array as the schema', () => {
    expect(source).toContain('<Faq faqs={tool.faqs} />');
  });

  it('mounts the converter island eagerly so the tool works above the fold', () => {
    expect(source).toMatch(/client:load/);
  });

  it('authors every content section it owns', () => {
    for (const id of INLINE_SECTIONS) {
      expect(source).toContain(`id="${id}"`);
    }
  });

  it('delegates the FAQ and related-tools sections to the shared components', () => {
    expect(source).toContain('<Faq ');
    expect(source).toContain('<RelatedTools ');
  });

  it('places the tool interface before the explanatory copy', () => {
    expect(source.indexOf('id="converter"')).toBeLessThan(source.indexOf('id="how-it-works"'));
  });

  it('uses the exact H1 from the registry', () => {
    const heading = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(source);
    expect(heading).not.toBeNull();
    expect(heading[1].replace(/\s+/g, ' ').trim()).toBe(tool.h1);
  });

  it('states the primary keyword in the opening paragraph', () => {
    const opening = source.slice(source.indexOf('</h1>'), source.indexOf('</h1>') + 700);
    expect(opening.toLowerCase()).toContain(tool.primaryKeyword.toLowerCase());
  });

  it('links to the related tool and the tools directory', () => {
    expect(source).toContain('RelatedTools');
    for (const related of tool.related) {
      const other = TOOLS.find((t) => t.slug === related);
      expect(other).toBeDefined();
    }
  });
});

describe('source: PDF page secondary keyword', () => {
  it('uses "Convert PDF to Markdown" naturally in the body copy', () => {
    const source = pageSource('pdf-to-markdown');
    expect(source).toMatch(/Convert PDF to Markdown/i);
  });
});

/* ----------------------------------------------------------- built output */

const distExists = existsSync(join(root, 'dist', 'tools', 'pdf-to-markdown', 'index.html'));

describe.skipIf(!distExists)('built HTML', () => {
  const builtHtml = (path) => readFileSync(join(root, 'dist', path, 'index.html'), 'utf8');

  /**
   * Strip markup down to what a reader sees. Entities are *decoded* rather
   * than blanked — replacing `&#39;` with a space would turn "Word's" into
   * "Word s" and break comparisons against the schema's raw text.
   */
  const visibleText = (html) =>
    html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');

  const jsonLd = (html) =>
    [...html.matchAll(/application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) =>
      JSON.parse(m[1]),
    );

  describe.each(TOOLS.map((tool) => [tool.slug, tool]))('%s', (slug, tool) => {
    const html = builtHtml(`tools/${slug}`);

    it('server-renders the copy into the initial HTML', () => {
      // Not behind an island: the prose must be in the document, not injected.
      expect(html).toContain('How it works');
      expect(html).toContain('Limitations');
    });

    it('renders every required section', () => {
      for (const id of REQUIRED_SECTIONS) {
        expect(html).toContain(`id="${id}"`);
      }
    });

    it('publishes at least 600 words of visible copy', () => {
      const words = visibleText(html).split(/\s+/).filter(Boolean).length;
      expect(words).toBeGreaterThanOrEqual(600);
    });

    it('has a unique title, description and canonical', () => {
      expect(html).toContain(`<title>${tool.title}</title>`);
      expect(html).toContain(`content="${tool.metaDescription}"`);
      expect(html).toContain(`<link rel="canonical" href="https://mdburst.com${tool.path}"`);
    });

    it('has Open Graph and Twitter metadata', () => {
      expect(html).toMatch(/property="og:title"/);
      expect(html).toMatch(/property="og:url"/);
      expect(html).toMatch(/property="og:description"/);
      expect(html).toMatch(/name="twitter:card"/);
      expect(html).toMatch(/name="twitter:title"/);
    });

    it('exposes exactly one H1, matching the registry', () => {
      const headings = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
      expect(headings).toHaveLength(1);
      expect(headings[0][1].replace(/<[^>]+>/g, '').trim()).toBe(tool.h1);
    });

    it('renders a visible breadcrumb trail plus BreadcrumbList schema', () => {
      expect(html).toContain('aria-label="Breadcrumb"');
      const breadcrumb = jsonLd(html).find((g) => g['@type'] === 'BreadcrumbList');
      expect(breadcrumb.itemListElement.at(-1).item).toBe(`https://mdburst.com${tool.path}`);
    });

    it('emits WebApplication schema for the converter', () => {
      const app = jsonLd(html).find((g) => g['@type'] === 'WebApplication');
      expect(app.name).toBe(tool.h1);
      expect(app.offers.price).toBe('0');
    });

    it('emits FAQPage schema whose questions are all visible on the page', () => {
      const faq = jsonLd(html).find((g) => g['@type'] === 'FAQPage');
      expect(faq.mainEntity).toHaveLength(tool.faqs.length);

      const text = visibleText(html).replace(/\s+/g, ' ');
      for (const entity of faq.mainEntity) {
        expect(text).toContain(entity.name.replace(/\s+/g, ' '));
        expect(text).toContain(entity.acceptedAnswer.text.slice(0, 60).replace(/\s+/g, ' '));
      }
    });

    it('links to the other tool and the directory', () => {
      expect(html).toContain('href="/tools/"');
      for (const related of tool.related) {
        const other = TOOLS.find((t) => t.slug === related);
        expect(html).toContain(`href="${other.path}"`);
      }
    });

    it('links back into the product pages', () => {
      expect(html).toContain('href="/#waitlist"');
      expect(html).toContain('href="/#how"');
    });

    it('is not blocked from indexing', () => {
      expect(html).not.toMatch(/name="robots"[^>]*content="[^"]*noindex/i);
    });
  });

  it('lists both tools in the sitemap', () => {
    const sitemap = readFileSync(join(root, 'dist', 'sitemap-0.xml'), 'utf8');
    for (const tool of TOOLS) {
      expect(sitemap).toContain(`https://mdburst.com${tool.path}`);
    }
  });

  it('links the tools from the directory index', () => {
    const html = builtHtml('tools');
    for (const tool of TOOLS) {
      expect(html).toContain(`href="${tool.path}"`);
    }
  });

  it('keeps the converter islands out of the shared entry chunk', () => {
    // pdf.js and docx must be lazily imported, not bundled into first paint.
    const html = builtHtml('tools/pdf-to-markdown');
    expect(html).not.toContain('pdf.worker');
  });
});
