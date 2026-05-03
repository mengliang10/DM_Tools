import { describe, expect, it } from "vitest";
import { analyzeOnPage } from "../src/modules/shared/onpage.js";
import { generateSerpPreview } from "../src/modules/shared/serp-preview.js";
import { analyzeKeywords, analyzeKeywordPlacement } from "../src/modules/shared/keyword.js";
import { validateSchema } from "../src/modules/shared/schema-validator.js";
import { checkTechnical } from "../src/modules/shared/technical.js";
import { scoreContentQuality } from "../src/modules/shared/content-quality.js";

describe("On-page", () => {
  it("scores a fully-optimised page near A grade", () => {
    const r = analyzeOnPage({
      title: "Best CRM Tools for SMBs in 2025 - Ultimate Guide",
      metaDesc: "Discover the best CRM tools for small businesses. Comprehensive guide covering features, pricing, and recommendations for 2025.",
      url: "https://example.com/best-crm-tools-smb",
      h1: "Best CRM Tools for SMBs",
      content: "best crm tools ".repeat(100) + "more content ".repeat(500),
      keyword: "best crm tools",
    });
    expect(r.score).toBeGreaterThan(60);
    expect(r.checks.length).toBeGreaterThan(10);
  });
  it("flags thin/empty content", () => {
    const r = analyzeOnPage({ title: "x", content: "tiny" });
    expect(r.score).toBeLessThan(40);
  });
});

describe("SERP preview", () => {
  it("truncates titles to 60 chars and meta to 160", () => {
    const long = "x".repeat(200);
    const r = generateSerpPreview({ title: long, metaDesc: long });
    expect(r.displayTitle.length).toBeLessThanOrEqual(60);
    expect(r.displayDesc.length).toBeLessThanOrEqual(160);
  });
});

describe("Keyword analysis", () => {
  it("returns top words and bigrams", () => {
    const text = "marketing automation marketing automation tools marketing tools tools tools";
    const r = analyzeKeywords(text);
    expect(r.totalWords).toBeGreaterThan(0);
    expect(r.topSingle.length).toBeGreaterThan(0);
  });
  it("computes placement when keyword present", () => {
    const r = analyzeKeywordPlacement("test keyword test keyword test", "keyword");
    expect(r.totalOccurrences).toBe(2);
    expect(r.inFirst100).toBe(true);
  });
});

describe("Schema validator", () => {
  it("accepts a well-formed Article", () => {
    const r = validateSchema(JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "x", author: "y", datePublished: "2025-01-01",
    }));
    expect(r.valid).toBe(true);
  });
  it("flags missing required fields", () => {
    const r = validateSchema(JSON.stringify({"@context":"https://schema.org","@type":"Article"}));
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
  it("rejects invalid JSON cleanly", () => {
    const r = validateSchema("{not valid}");
    expect(r.valid).toBe(false);
  });
});

describe("Technical audit", () => {
  it("recognises common signals from raw HTML", () => {
    const html = `<html><head><title>x</title><meta charset="UTF-8"><meta name="viewport" content="width=device-width">
                  <script type="application/ld+json">{}</script><meta property="og:title" content="x"></head>
                  <body><h1>x</h1><h2>y</h2><a href="/local">x</a><a href="https://google.com">y</a></body></html>`;
    const r = checkTechnical({ html, url: "https://example.com/x", title: "x", metaDesc: "y".repeat(120) });
    expect(r.passed).toBeGreaterThan(5);
  });
});

describe("Content quality", () => {
  it("returns a 0-100 score and grade", () => {
    const r = scoreContentQuality("word ".repeat(800) + " for example 50% data");
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(["A","B","C","D","F"]).toContain(r.grade);
  });
});
