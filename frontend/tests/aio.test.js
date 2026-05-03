import { describe, expect, it } from "vitest";
import { checkAIOEligibility } from "../src/modules/shared/aio-eligibility.js";
import { scoreEEAT } from "../src/modules/shared/eeat-scorer.js";
import { analyzeReadability } from "../src/modules/shared/readability.js";
import { rankPassages } from "../src/modules/shared/passage-ranker.js";
import { analyzeContentGaps } from "../src/modules/shared/content-gap.js";

const SAMPLE = `
## What is Generative Engine Optimization?

Generative Engine Optimization (GEO) is the practice of structuring content so AI engines like ChatGPT and Perplexity will cite it. According to research published in 2025, citation rates increased 38% for sites using GEO best practices.

### How does it work?

The process works by adding clear definitions, statistics, and structured lists to your content. For example:

- Use H2 and H3 headings to organize topics
- Include 2+ statistics per page
- Add a FAQ section

### Author

Written by Jane Smith, expert in technical SEO with 15 years of experience.
`.trim();

describe("AIO eligibility", () => {
  it("scores comprehensive content highly", () => {
    const r = checkAIOEligibility(SAMPLE);
    expect(r.totalScore).toBeGreaterThan(40);
    expect(r.checks.length).toBeGreaterThan(8);
  });
  it("flags thin content as Very Low", () => {
    const r = checkAIOEligibility("Just a few words.");
    expect(["Low", "Very Low"]).toContain(r.eligibilityLevel);
  });
});

describe("E-E-A-T scorer", () => {
  it("returns four dimensions out of 25 each, total <= 100", () => {
    const r = scoreEEAT(SAMPLE);
    expect(r.experience).toBeLessThanOrEqual(25);
    expect(r.expertise).toBeLessThanOrEqual(25);
    expect(r.authoritativeness).toBeLessThanOrEqual(25);
    expect(r.trustworthiness).toBeLessThanOrEqual(25);
    expect(r.total).toBeLessThanOrEqual(100);
    expect(["A","B","C","D","F"]).toContain(r.grade);
  });
});

describe("Readability", () => {
  it("computes a Flesch score in [0, 100]", () => {
    const r = analyzeReadability(SAMPLE);
    expect(r.fleschScore).toBeGreaterThanOrEqual(0);
    expect(r.fleschScore).toBeLessThanOrEqual(100);
    expect(r.totalWords).toBeGreaterThan(20);
  });
});

describe("Passage ranker", () => {
  it("ranks at least one passage from a non-trivial input", () => {
    const r = rankPassages(SAMPLE);
    expect(r.ranked.length).toBeGreaterThan(0);
    expect(r.ranked[0].score).toBeGreaterThan(0);
  });
});

describe("Content gap", () => {
  it("identifies found and missing AIO elements", () => {
    const r = analyzeContentGaps(SAMPLE);
    expect(r.found.length + r.missing.length).toBe(10);
    expect(r.coveragePercent).toBeGreaterThanOrEqual(0);
    expect(r.coveragePercent).toBeLessThanOrEqual(100);
  });
});
