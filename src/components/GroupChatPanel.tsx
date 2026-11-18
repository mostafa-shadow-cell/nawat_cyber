import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Lock, MessageSquare, Send } from 'lucide-react';
import {
  loadGroupMessagesFromStorage,
  saveGroupMessagesToStorage,
  validateAndCreateGroupMessage,
  type GroupChatMessage,
} from '../utils/groupChat';

interface GroupChatPanelProps {
  defaultSenderName?: string;
}

export function GroupChatPanel({ defaultSenderName = '' }: GroupChatPanelProps) {
  const [messages, setMessages] = useState<GroupChatMessage[]>(() =>
    loadGroupMessagesFromStorage()
  );
  const [senderName, setSenderName] = useState(defaultSenderName);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveGroupMessagesToStorage(messages);
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const res = validateAndCreateGroupMessage(senderName, messageText);
    if (!res.valid || !res.entry) {
      setError(res.errorAr ?? 'تعذر إرسال الرسالة.');
      return;
    }
    setError(null);
    setMessages((prev) => [...prev, res.entry!]);
    setMessageText('');
  };

  return (
    <section
      dir="rtl"
      aria-label="الدردشة الجماعية الخاصة للفريق"
      className="rounded-xl border border-cyan-500/35 bg-[#0E131B] overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0B1017] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="h-5 w-5 text-cyan-400" aria-hidden="true" />
          <div>
            <h2 className="font-display text-base font-bold text-slate-50">
              الدردشة الجماعية الخاصة للفريق
            </h2>
            <p className="text-xs text-slate-400">
              قناة مغلقة — متاحة فقط بعد اجتياز التحقق برمز الفريق
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>غرفة مغلقة موثّقة</span>
        </span>
      </div>

      {/* Group Messages Feed */}
      <div
        ref={feedRef}
        className="max-h-72 space-y-3 overflow-y-auto bg-[#07090D] p-5"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="rounded-xl border border-slate-800/90 bg-[#0E131B] p-3.5 text-xs leading-relaxed"
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-cyan-300">
                  {msg.senderName}
                </span>
                <span className="text-[11px] text-slate-400">
                  · {msg.roleLabelAr}
                </span>
              </div>
              <span
                dir="ltr"
                className="font-mono text-[11px] tabular-nums text-slate-500"
              >
                {msg.timestamp}
              </span>
            </div>
            <p className="text-slate-200">{msg.text}</p>
          </div>
        ))}
      </div>

      {/* Sanitized Group Message Composer */}
      <form
        onSubmit={handleSend}
        className="space-y-3 border-t border-slate-800 bg-[#0B0F16] p-5"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor="group-chat-author"
              className="mb-1 block text-xs text-slate-400"
            >
              اسم العضو
            </label>
            <input
              id="group-chat-author"
              type="text"
              value={senderName}
              onChange={(e) => {
                setSenderName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="مثال: سارة"
              className="w-full rounded-lg border border-slate-700 bg-[#07090D] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="group-chat-message"
              className="mb-1 block text-xs text-slate-400"
            >
              رسالة المجموعة
            </label>
            <div className="flex gap-2">
              <input
                id="group-chat-message"
                type="text"
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="شارك تحديثاً أو استفساراً مع أعضاء الفريق..."
                className="flex-1 rounded-lg border border-slate-700 bg-[#07090D] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 whitespace-nowrap shrink-0 transition-colors hover:bg-cyan-400"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>إرسال</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </section>
  );
}
