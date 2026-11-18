import { useState } from 'react';
import { Check, Copy, Play } from 'lucide-react';
import type { CodeSnippet } from '../types/platform';

interface CodeBlockProps {
  snippet: CodeSnippet;
  onRunInTerminal?: (command: string) => void;
}

export function CodeBlock({ snippet, onRunInTerminal }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored in restricted environments
    }
  };

  const lines = snippet.code.split('\n');
  const firstCommand = lines[0]?.trim() ?? '';

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#05070A]">
      <div
        dir="rtl"
        className="flex items-center justify-between gap-3 border-b border-slate-800/80 bg-[#0B1017] px-3.5 py-2"
      >
        <span className="text-xs font-medium text-slate-300 truncate">
          {snippet.label ?? 'أمر التنفيذ'}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {onRunInTerminal && firstCommand && (
            <button
              type="button"
              onClick={() => onRunInTerminal(firstCommand)}
              aria-label={`تجربة الأمر ${firstCommand} في الطرفية`}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 whitespace-nowrap shrink-0 transition-colors hover:bg-emerald-500/20 focus-visible:outline-2 focus-visible:outline-emerald-400"
            >
              <Play className="h-3 w-3" aria-hidden="true" />
              <span>جرّب في الطرفية</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? 'تم نسخ الأمر' : 'نسخ الكود'}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:border-cyan-500/50 hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-300">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" aria-hidden="true" />
                <span>نسخ</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Strict LTR alignment for commands, code snippets, and flags */}
      <pre
        dir="ltr"
        className="overflow-x-auto p-4 text-left font-mono text-[13px] leading-relaxed text-cyan-200"
      >
        <code>
          {lines.map((line, index) => (
            <div key={index} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="select-none text-emerald-400/80"
              >
                $
              </span>
              <span className="whitespace-pre text-slate-100">{line}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
