import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  MessageSquare,
  Send,
  ShieldCheck,
  Ticket,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CONTACT_TOPICS,
  DEVELOPER_CONTACT_CONFIG,
  getTopicLabelAr,
  type ContactFormInput,
  type ContactTopic,
  type InternalSupportTicket,
} from '../utils/developerContact';

interface ChatMessage {
  id: string;
  sender: 'dev' | 'user';
  topicLabel?: string;
  ticketCode?: string;
  author: string;
  text: string;
  timestamp: string;
}

interface DeveloperChatWidgetProps {
  tickets: InternalSupportTicket[];
  currentUsername?: string;
  currentNickname?: string;
  onSubmitTicket: (input: ContactFormInput) => {
    success: boolean;
    ticket?: InternalSupportTicket;
    errorAr?: string;
  };
}

function getCurrentTimeLabel(): string {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DeveloperChatWidget({
  tickets,
  currentNickname,
  onSubmitTicket,
}: DeveloperChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'tickets'>('new');
  const [showTooltip, setShowTooltip] = useState(false);
  const [name, setName] = useState(currentNickname ?? '');
  const [topic, setTopic] = useState<ContactTopic>('challenge_inquiry');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] =
    useState<InternalSupportTicket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-shadow',
      sender: 'dev',
      author: DEVELOPER_CONTACT_CONFIG.developerName,
      text: 'مرحباً بك في نظام الدعم الداخلي لنواة سايبر! جميع التذاكر والاستفسارات تُدار بأمان تام داخل المنصة مباشرة.',
      timestamp: getCurrentTimeLabel(),
    },
  ]);

  const chatFeedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentNickname && !name) {
      setName(currentNickname);
    }
  }, [currentNickname, name]);

  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [messages, isOpen, submittedTicket, activeTab]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = onSubmitTicket({ name, topic, message });

    if (!res.success || !res.ticket) {
      setError(res.errorAr ?? 'يرجى التحقق من البيانات المدخلة.');
      return;
    }

    const ticket = res.ticket;
    setError(null);
    const now = getCurrentTimeLabel();
    const userMsg: ChatMessage = {
      id: `user-${ticket.id}`,
      sender: 'user',
      author: ticket.senderName,
      topicLabel: getTopicLabelAr(ticket.topic),
      ticketCode: ticket.ticketCode,
      text: ticket.message,
      timestamp: now,
    };
    const autoReplyMsg: ChatMessage = {
      id: `dev-${ticket.id}`,
      sender: 'dev',
      author: DEVELOPER_CONTACT_CONFIG.developerName,
      ticketCode: ticket.ticketCode,
      text: ticket.automatedReplyAr,
      timestamp: now,
    };

    setMessages((prev) => [...prev, userMsg, autoReplyMsg]);
    setSubmittedTicket(ticket);
    setMessage('');
  };

  return (
    <div dir="rtl" className="fixed bottom-5 left-5 z-50 flex flex-col items-start">
      <AnimatePresence>
        {isOpen && (
          <motion.section
            key="dev-chat-modal"
            role="dialog"
            aria-label="تواصل داخلي وتذاكر الدعم مع المطور Shadow"
            data-testid="internal-support-modal"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 flex max-h-[82vh] w-[min(calc(100vw-2.5rem),410px)] flex-col overflow-hidden rounded-2xl border border-cyan-500/35 bg-[#0B0F16] shadow-[0_18px_48px_rgba(0,0,0,0.75)]"
          >
            {/* Header: Developer Shadow + Internal Only Indicator */}
            <header className="flex items-center justify-between gap-3 border-b border-slate-800 bg-[#0E141E] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-slate-50">
                    المطور:{' '}
                    <bdi dir="ltr" className="font-mono text-cyan-300">
                      {DEVELOPER_CONTACT_CONFIG.developerName}
                    </bdi>
                  </h2>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-300">
                    <span className="relative flex h-2 w-2" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <span>تذكرة دعم داخلية · متصل</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="إغلاق نافذة التواصل مع المطور"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800/60 text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            {/* Internal Mode Tabs */}
            <div
              role="tablist"
              aria-label="أقسام الدعم الداخلي"
              className="grid grid-cols-2 gap-1.5 border-b border-slate-800 bg-[#080B10] px-4 py-2"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'new'}
                onClick={() => setActiveTab('new')}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === 'new'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                إرسال تذكرة دعم
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'tickets'}
                onClick={() => setActiveTab('tickets')}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === 'tickets'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                سجل التذاكر ({tickets.length})
              </button>
            </div>

            {activeTab === 'tickets' ? (
              <div
                data-testid="internal-tickets-list"
                className="flex-1 space-y-2.5 overflow-y-auto bg-[#07090D] p-4 max-h-96"
              >
                {tickets.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-[#0E131B] p-6 text-center text-xs text-slate-400">
                    لا توجد تذاكر دعم مسجلة بعد. يمكنك فتح تذكرة جديدة للتواصل مع المطور داخل المنصة.
                  </div>
                ) : (
                  tickets.slice(0, 12).map((t) => (
                    <article
                      key={t.id}
                      data-testid={`support-ticket-item-${t.ticketCode}`}
                      className="rounded-xl border border-slate-800 bg-[#0E131B] p-3 text-xs"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span
                          dir="ltr"
                          className="font-mono font-bold text-cyan-300"
                        >
                          {t.ticketCode}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                            t.status === 'resolved'
                              ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : 'border border-amber-500/40 bg-amber-500/10 text-amber-200'
                          }`}
                        >
                          {t.status === 'resolved' ? 'تمت المعالجة' : 'قيد المراجعة'}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-200">
                        {getTopicLabelAr(t.topic)} · {t.senderName}
                      </p>
                      <p className="mt-1 leading-relaxed text-slate-400">
                        {t.message}
                      </p>
                    </article>
                  ))
                )}
              </div>
            ) : (
              <>
                {/* Internal Message Thread */}
                <div
                  ref={chatFeedRef}
                  className="flex-1 space-y-3 overflow-y-auto bg-[#07090D] p-4 max-h-52"
                >
                  {messages.map((msg) => {
                    const isDev = msg.sender === 'dev';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isDev ? 'items-start' : 'items-end'
                        }`}
                      >
                        <div
                          className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            isDev
                              ? 'border border-slate-800 bg-[#0E131B] text-slate-200'
                              : 'border border-cyan-500/30 bg-cyan-500/15 text-cyan-50'
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                            <span className="font-semibold text-cyan-300">
                              {msg.author}
                            </span>
                            <span dir="ltr" className="font-mono tabular-nums">
                              {msg.ticketCode ? `${msg.ticketCode} · ` : ''}
                              {msg.timestamp}
                            </span>
                          </div>
                          {msg.topicLabel && (
                            <p className="mb-1 text-[11px] font-medium text-emerald-300">
                              الموضوع: {msg.topicLabel}
                            </p>
                          )}
                          <p>{msg.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Internal Support Ticket Form / Success Confirmation */}
                <div className="border-t border-slate-800 bg-[#0B0F16] p-4">
                  {submittedTicket ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      role="status"
                      data-testid="internal-ticket-success"
                      className="space-y-3"
                    >
                      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs leading-relaxed text-emerald-200">
                        <motion.div
                          initial={{ scale: 0.5, rotate: -15 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                        >
                          <CheckCircle2
                            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
                            aria-hidden="true"
                          />
                        </motion.div>
                        <div>
                          <p className="font-semibold text-emerald-300">
                            تم فتح التذكرة الداخلية{' '}
                            <span dir="ltr" className="font-mono">
                              {submittedTicket.ticketCode}
                            </span>{' '}
                            بنجاح!
                          </p>
                          <p className="mt-0.5 text-slate-300">
                            تم حفظ رسالتك في نظام الدعم الداخلي وإشعار المطور Shadow داخل المنصة دون أي روابط خارجية.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSubmittedTicket(null)}
                          className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500 hover:text-slate-950"
                        >
                          فتح تذكرة جديدة
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('tickets')}
                          className="rounded-lg border border-slate-700 bg-[#07090D] px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-500/40"
                        >
                          متابعة التذاكر
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-2.5">
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="dev-chat-name"
                            className="mb-1 block text-[11px] text-slate-400"
                          >
                            الاسم
                          </label>
                          <input
                            id="dev-chat-name"
                            type="text"
                            value={name}
                            onChange={(e) => {
                              setName(e.target.value);
                              if (error) setError(null);
                            }}
                            placeholder="اسمك أو لقبك"
                            className="w-full rounded-lg border border-slate-700 bg-[#07090D] px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="dev-chat-topic"
                            className="mb-1 block text-[11px] text-slate-400"
                          >
                            تصنيف التذكرة
                          </label>
                          <select
                            id="dev-chat-topic"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value as ContactTopic)}
                            className="w-full rounded-lg border border-slate-700 bg-[#07090D] px-2.5 py-1.5 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                          >
                            {CONTACT_TOPICS.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.labelAr}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="dev-chat-message"
                          className="mb-1 block text-[11px] text-slate-400"
                        >
                          تفاصيل الرسالة / التذكرة
                        </label>
                        <textarea
                          id="dev-chat-message"
                          rows={2}
                          value={message}
                          onChange={(e) => {
                            setMessage(e.target.value);
                            if (error) setError(null);
                          }}
                          placeholder="اكتب رسالتك للمطور Shadow داخل المنصة..."
                          className="w-full resize-none rounded-lg border border-slate-700 bg-[#07090D] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                        />
                      </div>

                      {error && (
                        <div
                          role="alert"
                          className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200"
                        >
                          <AlertCircle
                            className="h-3.5 w-3.5 shrink-0 text-rose-400"
                            aria-hidden="true"
                          />
                          <span>{error}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        data-testid="internal-ticket-submit"
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-cyan-300"
                      >
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>إرسال تذكرة داخلية للمطور</span>
                      </button>
                    </form>
                  )}

                  {/* Strictly Internal Platform Channel Notice */}
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1.5 text-emerald-300/90">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      <span>قناة دعم داخلية آمنة فقط</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Ticket className="h-3 w-3" aria-hidden="true" />
                      <span>بدون تحويل خارجي</span>
                    </span>
                  </div>
                </div>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Floating Cyber Chat Trigger Button + Tooltip */}
      <div className="relative flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setIsOpen((prev) => !prev);
            setShowTooltip(false);
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          aria-expanded={isOpen}
          aria-label="مرحباً بك! تواصل مع المطور"
          data-testid="developer-support-fab"
          className="group relative flex h-13 w-13 items-center justify-center rounded-full border border-cyan-400/60 bg-[#0B111A] text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.28)] transition-all duration-200 hover:scale-105 hover:border-cyan-300 hover:bg-cyan-500 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          {!isOpen && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full border border-cyan-400/50 animate-ping"
              style={{ animationDuration: '2.6s' }}
            />
          )}
          {isOpen ? (
            <X className="relative h-5 w-5" aria-hidden="true" />
          ) : (
            <MessageSquare className="relative h-5 w-5" aria-hidden="true" />
          )}
        </button>

        {!isOpen && (
          <div
            role="tooltip"
            className={`pointer-events-none rounded-lg border border-cyan-500/35 bg-[#0B111A]/95 px-3 py-1.5 text-xs font-medium text-cyan-100 whitespace-nowrap shadow-lg backdrop-blur-sm transition-all duration-150 ${
              showTooltip
                ? 'translate-x-0 opacity-100'
                : '-translate-x-1 opacity-0 sm:translate-x-0 sm:opacity-100'
            }`}
          >
            مرحباً بك! تواصل مع المطور
          </div>
        )}
      </div>
    </div>
  );
}
