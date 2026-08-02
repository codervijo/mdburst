/**
 * JSON-LD builders for the tool pages.
 *
 * Every builder takes the same `ToolDefinition` the page renders from, so the
 * structured data describes what is actually on the page. In particular
 * `faqPageSchema` reads the identical FAQ array the page prints — Google's
 * FAQPage guidelines require the marked-up Q&A to be visible to users, and
 * generating both from one source is the only way to keep that true as copy
 * changes.
 */

import { absoluteUrl, SITE_URL, type FaqEntry, type ToolDefinition } from "../data/tools";

export interface BreadcrumbEntry {
  name: string;
  path: string;
}

/** BreadcrumbList matching the visible breadcrumb trail, in the same order. */
export function breadcrumbSchema(trail: BreadcrumbEntry[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: absoluteUrl(entry.path),
    })),
  };
}

/**
 * WebApplication describing the converter.
 *
 * WebApplication is used rather than SoftwareApplication because the tool runs
 * in the browser with nothing to install. `offers` at price 0 is the documented
 * way to state that something is free.
 */
export function webApplicationSchema(tool: ToolDefinition): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${absoluteUrl(tool.path)}#webapp`,
    name: tool.h1,
    url: absoluteUrl(tool.path),
    description: tool.metaDescription,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (runs in a web browser)",
    browserRequirements: "Requires JavaScript. Works in current Chrome, Firefox, Safari and Edge.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    isAccessibleForFree: true,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

/**
 * FAQPage built from a list of FAQ entries.
 *
 * Callers must render the same entries visibly on the page. Returns undefined
 * for an empty list so a page without visible Q&A never emits orphan markup.
 */
export function faqSchemaFromEntries(faqs: FaqEntry[]): Record<string, unknown> | undefined {
  if (faqs.length === 0) return undefined;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/** FAQPage for a tool page, from that tool's own FAQ. */
export function faqPageSchema(tool: ToolDefinition): Record<string, unknown> | undefined {
  return faqSchemaFromEntries(tool.faqs);
}

/** ItemList for the /tools/ directory. */
export function toolListSchema(tools: ToolDefinition[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "mdburst free Markdown tools",
    itemListElement: tools.map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tool.h1,
      url: absoluteUrl(tool.path),
    })),
  };
}
