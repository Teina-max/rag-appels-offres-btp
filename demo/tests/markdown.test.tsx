import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AnswerMarkdown } from "../src/lib/markdown";

const html = (text: string) => renderToStaticMarkup(<AnswerMarkdown text={text} />);

describe("AnswerMarkdown", () => {
  test("renders a markdown table as a real <table>, not raw pipes", () => {
    const md = "| Lieu | Rondes |\n|---|---|\n| Vignon | 3 rondes |\n| Hôtel | 8 rondes |";
    const out = html(md);
    expect(out).toContain("<table");
    expect(out).toContain("<th>Lieu</th>");
    expect(out).toContain("<td>Vignon</td>");
    expect(out).not.toContain("|---|");
  });

  test("renders --- as a horizontal rule, not a paragraph of dashes", () => {
    const out = html("Avant\n\n---\n\nApres");
    expect(out).toContain("<hr");
    expect(out).not.toContain("<p>---</p>");
  });

  test("renders an ordered list", () => {
    const out = html("1. Premier\n2. Second");
    expect(out).toContain("<ol");
    expect(out).toContain("<li>Premier</li>");
  });

  test("keeps bold, citations and bullets", () => {
    const out = html("- **Gras** avec [3]");
    expect(out).toContain("<strong>Gras</strong>");
    expect(out).toContain("<sup>[3]</sup>");
    expect(out).toContain("<li>");
  });
});
