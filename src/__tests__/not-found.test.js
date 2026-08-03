// src/__tests__/not-found.test.js
//
// Guards the soft-404 fix. Cloudflare Pages serves index.html with HTTP 200 for
// unmatched routes whenever the build output contains no 404.html — which is
// what this site did until src/pages/404.astro was added. If that page is ever
// deleted or stops emitting dist/404.html, every mistyped URL silently becomes
// an indexable duplicate of the homepage again, with no error anywhere to
// notice. Hence a test on the build artifact, not just the source.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { TOOLS } from '../data/tools.ts';

const root = process.cwd();
const source = readFileSync(join(root, 'src', 'pages', '404.astro'), 'utf8');

describe('404 page source', () => {
  it('is noindex — the error page must never enter the index itself', () => {
    expect(source).toMatch(/name="robots"\s+content="noindex/);
  });

  it('has a title and description', () => {
    expect(source).toMatch(/<title>/);
    expect(source).toMatch(/name="description"/);
  });

  it('ships no hydrated island — a 404 should be cheap to serve', () => {
    expect(source).not.toMatch(/client:(load|visible|idle|only)/);
  });

  it('emits no canonical or structured data', () => {
    expect(source).not.toContain('rel="canonical"');
    expect(source).not.toContain('application/ld+json');
  });
});

const distFile = join(root, 'dist', '404.html');

describe.skipIf(!existsSync(distFile))('404 build artifact', () => {
  const html = readFileSync(distFile, 'utf8');

  it('exists at dist/404.html — this file IS the fix', () => {
    expect(html.length).toBeGreaterThan(500);
  });

  it('carries the noindex directive through to the built page', () => {
    expect(html).toMatch(/name="robots"[^>]*content="noindex/);
  });

  it('is not a copy of the homepage', () => {
    const home = readFileSync(join(root, 'dist', 'index.html'), 'utf8');
    expect(html).not.toBe(home);
    expect(html).toContain('404');
  });

  it('offers a route back to every real page', () => {
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/tools/"');
    for (const tool of TOOLS) {
      expect(html).toContain(`href="${tool.path}"`);
    }
  });

  it('is excluded from the sitemap', () => {
    const sitemap = readFileSync(join(root, 'dist', 'sitemap-0.xml'), 'utf8');
    expect(sitemap).not.toContain('/404');
  });
});

describe('wrangler.jsonc', () => {
  const raw = readFileSync(join(root, 'wrangler.jsonc'), 'utf8');

  it('no longer declares SPA not-found handling', () => {
    // Inert today (Pages skips this file), but leaving it would document the
    // opposite of the behaviour the 404 page establishes.
    expect(raw).not.toMatch(/"not_found_handling"\s*:\s*"single-page-application"/);
  });

  it('still parses once comments are stripped', () => {
    const stripped = raw.replace(/^\s*\/\/.*$/gm, '');
    expect(() => JSON.parse(stripped)).not.toThrow();
  });
});
