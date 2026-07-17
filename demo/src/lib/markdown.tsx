import type { ReactNode } from "react";

/**
 * Minimal renderer for the constrained markdown Claude produces here
 * (### headings, - bullets, **bold**, [n] citations). Builds React nodes
 * directly: no HTML injection surface.
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

export function AnswerMarkdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: ReactNode[] = [];

  const flushBullets = (key: string) => {
    if (!bullets.length) return;
    blocks.push(<ul key={key}>{bullets}</ul>);
    bullets = [];
  };

  text.split("\n").forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line) {
      flushBullets(`ul-${i}`);
      return;
    }
    const heading = line.match(/^#{2,4}\s+(.*)$/);
    if (heading) {
      flushBullets(`ul-${i}`);
      blocks.push(<h3 key={`h-${i}`}>{renderInline(heading[1]!, `h-${i}`)}</h3>);
      return;
    }
    if (line.startsWith("- ")) {
      bullets.push(<li key={`li-${i}`}>{renderInline(line.slice(2), `li-${i}`)}</li>);
      return;
    }
    flushBullets(`ul-${i}`);
    blocks.push(<p key={`p-${i}`}>{renderInline(line, `p-${i}`)}</p>);
  });

  flushBullets("ul-end");
  return <div className="answer-body">{blocks}</div>;
}
