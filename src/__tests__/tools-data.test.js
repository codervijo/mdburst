// src/__tests__/tools-data.test.js
//
// Invariants for the tool registry and the JSON-LD builders. These guard the
// SEO contract that is easy to break silently later: unique titles, canonical
// paths that match the sitemap's trailing-slash form, the primary keyword
// actually appearing where it was targeted, and — most importantly — FAQ
// structured data that matches the FAQ the page renders.

import { describe, it, expect } from 'vitest';
import { TOOLS, getTool, relatedTools, absoluteUrl, SITE_URL } from '../data/tools.ts';
import {
  breadcrumbSchema,
  faqPageSchema,
  webApplicationSchema,
  toolListSchema,
} from '../lib/schema.ts';

describe('tool registry', () => {
  it('defines both converters', () => {
    expect(TOOLS.map((t) => t.slug).sort()).toEqual(['markdown-to-docx', 'pdf-to-markdown']);
  });

  it('gives every tool a unique title and meta description', () => {
    const titles = new Set(TOOLS.map((t) => t.title));
    const descriptions = new Set(TOOLS.map((t) => t.metaDescription));
    expect(titles.size).toBe(TOOLS.length);
    expect(descriptions.size).toBe(TOOLS.length);
  });

  it('keeps meta descriptions within the length Google renders', () => {
    for (const tool of TOOLS) {
      expect(tool.metaDescription.length).toBeGreaterThan(70);
      expect(tool.metaDescription.length).toBeLessThanOrEqual(165);
    }
  });

  it('uses canonical paths with a trailing slash, matching the sitemap', () => {
    for (const tool of TOOLS) {
      expect(tool.path).toMatch(/^\/tools\/[a-z0-9-]+\/$/);
    }
  });

  it('puts the primary keyword in the path, title and H1', () => {
    for (const tool of TOOLS) {
      const keyword = tool.primaryKeyword.toLowerCase();
      const slugForm = keyword.replace(/\s+/g, '-');
      expect(tool.path).toContain(slugForm);
      expect(tool.title.toLowerCase()).toContain(keyword);
      expect(tool.h1.toLowerCase()).toContain(keyword);
    }
  });

  it('targets "Convert PDF to Markdown" as a secondary keyword on the PDF tool', () => {
    const tool = getTool('pdf-to-markdown');
    expect(tool.secondaryKeywords).toContain('Convert PDF to Markdown');
  });

  it('cross-links the tools to each other', () => {
    expect(relatedTools('pdf-to-markdown').map((t) => t.slug)).toContain('markdown-to-docx');
    expect(relatedTools('markdown-to-docx').map((t) => t.slug)).toContain('pdf-to-markdown');
  });

  it('never lists a tool as related to itself', () => {
    for (const tool of TOOLS) {
      expect(tool.related).not.toContain(tool.slug);
    }
  });

  it('throws on an unknown slug rather than returning undefined', () => {
    expect(() => getTool('nope')).toThrow(/Unknown tool/);
  });

  it('builds absolute URLs on the canonical host', () => {
    expect(absoluteUrl('/tools/')).toBe(`${SITE_URL}/tools/`);
  });
});

describe('FAQ content', () => {
  it('gives each tool a substantive FAQ', () => {
    for (const tool of TOOLS) {
      expect(tool.faqs.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('asks real questions and answers them at length', () => {
    for (const tool of TOOLS) {
      for (const faq of tool.faqs) {
        expect(faq.question).toMatch(/\?$/);
        expect(faq.answer.length).toBeGreaterThan(80);
      }
    }
  });

  it('has no duplicate questions within a tool', () => {
    for (const tool of TOOLS) {
      const questions = new Set(tool.faqs.map((f) => f.question));
      expect(questions.size).toBe(tool.faqs.length);
    }
  });
});

describe('JSON-LD builders', () => {
  it('builds a BreadcrumbList in trail order with absolute items', () => {
    const schema = breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Tools', path: '/tools/' },
    ]);
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[1].item).toBe('https://mdburst.com/tools/');
  });

  it('builds a free WebApplication for each tool', () => {
    for (const tool of TOOLS) {
      const schema = webApplicationSchema(tool);
      expect(schema['@type']).toBe('WebApplication');
      expect(schema.url).toBe(absoluteUrl(tool.path));
      expect(schema.offers.price).toBe('0');
      expect(schema.isAccessibleForFree).toBe(true);
    }
  });

  it('mirrors the tool FAQ exactly in the FAQPage schema', () => {
    for (const tool of TOOLS) {
      const schema = faqPageSchema(tool);
      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity).toHaveLength(tool.faqs.length);

      schema.mainEntity.forEach((entity, index) => {
        expect(entity.name).toBe(tool.faqs[index].question);
        expect(entity.acceptedAnswer.text).toBe(tool.faqs[index].answer);
      });
    }
  });

  it('emits no FAQPage schema when there is no visible FAQ', () => {
    expect(faqPageSchema({ ...TOOLS[0], faqs: [] })).toBeUndefined();
  });

  it('lists every tool in the directory ItemList', () => {
    const schema = toolListSchema(TOOLS);
    expect(schema['@type']).toBe('ItemList');
    expect(schema.itemListElement).toHaveLength(TOOLS.length);
  });
});
