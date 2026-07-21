import type { ReactNode } from "react";

/**
 * Minimal renderer for the constrained markdown Claude produces here
 * (### headings, -/1. lists, tables, --- rules, **bold**, [n] citations).
 * Builds React nodes directly: no HTML injection surface.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[(\d+)\]/g;
  let cursor = 0;
  let index = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    if (match[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b${index}`}>{match[1]}</strong>);
    } else {
      nodes.push(<sup key={`${keyPrefix}-c${index}`}>[{match[2]}]</sup>);
    }
    cursor = match.index + match[0].length;
    index += 1;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

const isTableRow = (l: string) => /^\|.*\|$/.test(l);
const isTableSep = (l: string) => /^\|[\s:|-]+\|$/.test(l) && l.includes("-");
const splitCells = (l: string) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function AnswerMarkdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: ReactNode[] = [];
  let ordered: ReactNode[] = [];

  const flushBullets = (key: string) => {
    if (bullets.length) { blocks.push(<ul key={key}>{bullets}</ul>); bullets = []; }
  };
  const flushOrdered = (key: string) => {
    if (ordered.length) { blocks.push(<ol key={key}>{ordered}</ol>); ordered = []; }
  };
  const flushLists = (key: string) => { flushBullets(`u-${key}`); flushOrdered(`o-${key}`); };

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();

    if (!line) {
      flushLists(`${i}`);
      continue;
    }

    // Table: a header row immediately followed by a |---|---| separator row.
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1]!.trim())) {
      flushLists(`${i}`);
      const header = splitCells(line);
      const rows: string[][] = [];
      let j = i + 2;
      for (; j < lines.length && isTableRow(lines[j]!.trim()); j++) rows.push(splitCells(lines[j]!.trim()));
      blocks.push(
        <div className="answer-table-wrap" key={`tw-${i}`}>
          <table className="answer-table">
            <thead>
              <tr>{header.map((c, k) => <th key={k}>{renderInline(c, `th-${i}-${k}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, k) => <td key={k}>{renderInline(c, `td-${i}-${ri}-${k}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      i = j - 1;
      continue;
    }

    // Horizontal rule (--- / *** / ___).
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushLists(`${i}`);
      blocks.push(<hr key={`hr-${i}`} className="answer-hr" />);
      continue;
    }

    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (heading) {
      flushLists(`${i}`);
      blocks.push(<h3 key={`h-${i}`}>{renderInline(heading[1]!, `h-${i}`)}</h3>);
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushOrdered(`o-${i}`);
      bullets.push(<li key={`li-${i}`}>{renderInline(line.slice(2), `li-${i}`)}</li>);
      continue;
    }

    const orderedItem = line.match(/^(\d+)\.\s+(.*)$/);
    if (orderedItem) {
      flushBullets(`u-${i}`);
      ordered.push(<li key={`oli-${i}`}>{renderInline(orderedItem[2]!, `oli-${i}`)}</li>);
      continue;
    }

    flushLists(`${i}`);
    blocks.push(<p key={`p-${i}`}>{renderInline(line, `p-${i}`)}</p>);
  }

  flushLists("end");
  return <div className="answer-body">{blocks}</div>;
}
