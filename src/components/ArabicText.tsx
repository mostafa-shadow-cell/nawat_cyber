import { Fragment } from 'react';

/**
 * Renders Arabic prose with strict RTL flow while isolating technical LTR tokens
 * (flags, filenames, commands, paths, HTTP methods) inside <bdi dir="ltr">
 * so punctuation like ؟ or . never jumps out of order.
 */
export function ArabicText({
  text,
  highlightCode = false,
}: {
  text: string;
  highlightCode?: boolean;
}) {
  // Match technical tokens: paths (/root/root.txt), flags (-sV, --status), commands/filenames (readme.txt, auth.log)
  const tokenRegex =
    /((?:\/[A-Za-z0-9._-]+)+|(?:--?[A-Za-z0-9-]+)|(?:[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)|(?:FLAG\{[^}]+\})|(?:[A-Za-z][A-Za-z0-9_-]*(?:\s+[A-Za-z0-9_./:-]+)*))/g;

  const parts = text.split(tokenRegex);

  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;
        const isLatinTech = /^[A-Za-z0-9_/.-]/.test(part);
        if (isLatinTech) {
          return (
            <bdi
              key={idx}
              dir="ltr"
              className={
                highlightCode
                  ? 'mx-0.5 inline-block rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[0.88em] text-cyan-200'
                  : 'inline-block font-mono text-[0.92em] text-cyan-200/95'
              }
            >
              {part}
            </bdi>
          );
        }
        return <Fragment key={idx}>{part}</Fragment>;
      })}
    </>
  );
}
