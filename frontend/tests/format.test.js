import { describe, expect, it } from "vitest";
import { escapeHtml, pct, gradeFromScore, renderMarkdown } from "../src/utils/format.js";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });
  it("returns empty string for null/undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("pct", () => {
  it("formats fractions correctly", () => {
    expect(pct(3, 4)).toBe("75%");
    expect(pct(0, 0)).toBe("0%");
  });
});

describe("gradeFromScore", () => {
  it("maps thresholds to letters", () => {
    expect(gradeFromScore(95, 100).letter).toBe("A");
    expect(gradeFromScore(80, 100).letter).toBe("B");
    expect(gradeFromScore(65, 100).letter).toBe("C");
    expect(gradeFromScore(45, 100).letter).toBe("D");
    expect(gradeFromScore(20, 100).letter).toBe("F");
  });
});

describe("renderMarkdown", () => {
  it("renders headings and sanitises script tags", () => {
    const html = renderMarkdown("# Hi\n\n<script>alert(1)</script>");
    expect(html).toContain("<h1>Hi</h1>");
    expect(html).not.toContain("<script>");
  });
});
