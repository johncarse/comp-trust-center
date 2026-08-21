import type { ReactNode } from "react";

/**
 * A deliberately tiny markdown renderer for Comp's `overviewContent`.
 *
 * It emits React elements, never HTML strings, so there is no
 * dangerouslySetInnerHTML anywhere in the trust center and no path by which
 * markup in the source content can become markup on the page. Supported:
 * `##` headings, `-` bullets, blank-line paragraphs, `**bold**`, `*emphasis*`, and
 * `[text](url)` links restricted to http(s) and mailto.
 *
 * Anything else renders as literal text. That is the intended trade: this is
 * a security page, and a narrow renderer that cannot be surprised is worth
 * more than full CommonMark.
 */

const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\([^)]+\))/g;

function isSafeHref(href: string): boolean {
  try {
    const url = new URL(href, "https://example.invalid");
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    // Single-asterisk emphasis, checked after bold so `**x**` is not eaten.
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }

    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      if (!isSafeHref(href)) return <span key={key}>{label}</span>;
      return (
        <a key={key} href={href} rel="noopener noreferrer nofollow">
          {label}
        </a>
      );
    }

    return <span key={key}>{part}</span>;
  });
}

export function Markdown({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {items.map((item, i) => (
          <li key={i}>{renderInline(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>,
    );
  };

  for (const raw of content.split("\n")) {
    const line = raw.trim();

    if (!line) {
      flushBullets();
      continue;
    }

    if (line.startsWith("## ")) {
      flushBullets();
      blocks.push(
        <h2 key={`h-${blocks.length}`}>
          {renderInline(line.slice(3), `h-${blocks.length}`)}
        </h2>,
      );
      continue;
    }

    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
      continue;
    }

    flushBullets();
    const prev = blocks[blocks.length - 1];
    // Consecutive non-blank lines are one paragraph, matching markdown's
    // soft-wrap behaviour rather than breaking mid-sentence.
    if (prev && typeof prev === "object" && "type" in prev && prev.type === "p") {
      blocks[blocks.length - 1] = (
        <p key={`p-${blocks.length}`}>
          {(prev as { props: { children: ReactNode } }).props.children}{" "}
          {renderInline(line, `p-${blocks.length}`)}
        </p>
      );
      continue;
    }
    blocks.push(
      <p key={`p-${blocks.length}`}>{renderInline(line, `p-${blocks.length}`)}</p>,
    );
  }

  flushBullets();
  return <div className="tc-prose">{blocks}</div>;
}
