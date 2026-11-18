import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Terminal as TerminalIcon, Trash2 } from 'lucide-react';
import type { SimulatedTerminalConfig, TerminalEntry } from '../types/platform';
import { evaluateTerminalCommand } from '../utils/terminal';

interface LabTerminalProps {
  config: SimulatedTerminalConfig;
  queuedCommand: { cmd: string; nonce: number } | null;
}

export function LabTerminal({ config, queuedCommand }: LabTerminalProps) {
  const [entries, setEntries] = useState<TerminalEntry[]>([
    {
      id: 'init-welcome',
      command: 'help',
      output: evaluateTerminalCommand('help', config).output,
    },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runCommand = useCallback(
    (rawCmd: string) => {
      const trimmed = rawCmd.trim();
      if (!trimmed) return;

      const result = evaluateTerminalCommand(trimmed, config);
      if (result.clear) {
        setEntries([]);
        return;
      }

      setEntries((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          command: trimmed,
          output: result.output,
          isError: result.isError,
        },
      ]);
      setHistory((prev) => [trimmed, ...prev.slice(0, 29)]);
      setHistoryIndex(-1);
    },
    [config]
  );

  // Reset terminal session when switching rooms
  useEffect(() => {
    setEntries([
      {
        id: `init-${config.hostname}`,
        command: 'help',
        output: evaluateTerminalCommand('help', config).output,
      },
    ]);
    setInput('');
    setHistory([]);
    setHistoryIndex(-1);
  }, [config]);

  // Execute command dispatched from guidance CodeBlock
  useEffect(() => {
    if (queuedCommand && queuedCommand.cmd) {
      runCommand(queuedCommand.cmd);
    }
  }, [queuedCommand, runCommand]);

  // Auto-scroll to latest terminal output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [entries]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runCommand(input);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex = Math.min(historyIndex + 1, history.length - 1);
      if (history[nextIndex] !== undefined) {
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = historyIndex - 1;
      if (nextIndex < 0) {
        setHistoryIndex(-1);
        setInput('');
      } else if (history[nextIndex] !== undefined) {
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
    }
  };

  const promptPrefix = `${config.username}@${config.hostname}:~$`;

  return (
    <section
      aria-label="الطرفية التفاعلية للبيئة المستهدفة"
      className="flex flex-col overflow-hidden rounded-xl border border-slate-800/90 bg-[#05070A]"
    >
      {/* Terminal Header Bar (Arabic RTL label + LTR target host) */}
      <div
        dir="rtl"
        className="flex items-center justify-between gap-3 border-b border-slate-800/80 bg-[#0B1017] px-4 py-2.5"
      >
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <h2 className="font-display text-sm font-semibold text-slate-100">
            الطرفية التفاعلية
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span
            dir="ltr"
            className="font-mono text-xs tabular-nums text-cyan-300/90"
          >
            {config.targetIp}
          </span>
          <button
            type="button"
            onClick={() => setEntries([])}
            aria-label="مسح شاشة الطرفية"
            className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-slate-800/60 px-2 py-1 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
            <span>مسح</span>
          </button>
        </div>
      </div>

      {/* Strict LTR Output Viewport */}
      <div
        ref={outputRef}
        dir="ltr"
        onClick={() => inputRef.current?.focus()}
        className="h-72 overflow-y-auto p-4 text-left font-mono text-xs leading-relaxed text-slate-200 sm:h-80"
      >
        {entries.length === 0 ? (
          <p className="text-slate-500">
            Terminal cleared. Type &apos;help&apos; to list commands.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-emerald-400 select-none">
                    {promptPrefix}
                  </span>
                  <span className="text-cyan-200">{entry.command}</span>
                </div>
                {entry.output && (
                  <pre
                    className={`mt-1 whitespace-pre-wrap break-all ${
                      entry.isError ? 'text-rose-300' : 'text-slate-300'
                    }`}
                  >
                    {entry.output}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Strict LTR Command Input Bar */}
      <form
        dir="ltr"
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-slate-800/80 bg-[#080B10] px-4 py-2.5 font-mono text-xs"
      >
        <label htmlFor="lab-terminal-input" className="text-emerald-400 shrink-0">
          {promptPrefix}
        </label>
        <input
          ref={inputRef}
          id="lab-terminal-input"
          type="text"
          dir="ltr"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command (e.g. ls -la) and press Enter"
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-transparent text-left text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />
      </form>
    </section>
  );
}
