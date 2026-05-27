'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, Loader2, ChevronRight } from 'lucide-react';
import { AxiosError } from 'axios';
import api from '@/lib/api';

type Role = 'user' | 'assistant';
interface Message {
  role: Role;
  content: string;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'Hi! I am your SAT AI Tutor. What would you like to practice today? Math or Reading?',
};

const QUICK_TOPICS = [
  { label: 'Explain quadratic equations', icon: '📐' },
  { label: 'Help with vocabulary', icon: '📝' },
  { label: 'Reading comprehension tips', icon: '📖' },
  { label: 'Practice algebra problems', icon: '🔢' },
  { label: 'Grammar rules review', icon: '✏️' },
  { label: 'Test-taking strategies', icon: '🎯' },
];

export default function AITutorPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [topicsVisible, setTopicsVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;

    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const { data } = await api.post<{ response: string; messages_remaining: number }>(
        '/api/ai/chat',
        { message: text, history },
      );
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
      setRemaining(data.messages_remaining);
    } catch (err) {
      const ax = err as AxiosError<{ detail?: string }>;
      const status = ax.response?.status;
      const detail = ax.response?.data?.detail;
      if (status === 429) {
        setError(detail || 'Daily AI message limit reached.');
      } else if (status === 401) {
        setError('Please log in to use the AI tutor.');
      } else {
        setError(detail || 'AI tutor is unavailable right now. Please try again.');
      }
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => sendMessage(input.trim());

  const handleQuickTopic = (topic: string) => {
    sendMessage(topic);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto flex gap-4 h-[calc(100dvh-120px)]">

        {/* ── Chat Area ── */}
        <div className="flex-1 flex flex-col bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-base">AI Tutor</h1>
                <p className="text-white/70 text-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Powered by Groq Llama 3.3
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {remaining !== null && (
                <div className="text-xs text-white/70 bg-white/10 px-3 py-1 rounded-full tabular-nums">
                  {remaining} left today
                </div>
              )}
              <button
                onClick={() => setTopicsVisible((v) => !v)}
                className="hidden lg:flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
              >
                {topicsVisible ? 'Hide' : 'Topics'} <ChevronRight className={`w-3 h-3 transition-transform duration-[var(--dur)] ease-[var(--ease)] ${topicsVisible ? 'rotate-0' : 'rotate-180'}`} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
            {messages.map((message, index) => (
              <div key={index} className={`flex gap-3 bubble-in ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] p-3.5 rounded-2xl whitespace-pre-wrap text-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-card border border-border text-foreground rounded-tl-sm shadow-sm'
                  }`}
                >
                  {message.content}
                </div>
                {message.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-text-2" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3 justify-start bubble-in">
                <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm shadow-sm p-3.5 flex items-center gap-2 text-text-3 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Input */}
          <div className="p-3 bg-card border-t border-border shrink-0">
            <div className="flex gap-2 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={sending}
                placeholder="Ask a question or request a practice topic..."
                className="flex-1 p-3 pr-12 bg-background border border-transparent focus:bg-card focus:border-accent rounded-xl outline-none transition-[background-color,border-color] duration-[var(--dur)] ease-[var(--ease)] disabled:opacity-60 text-foreground text-sm"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary hover:bg-accent disabled:bg-foreground/20 disabled:cursor-not-allowed text-white rounded-lg transition-[transform,background-color] duration-[var(--dur)] ease-[var(--ease)] active:scale-[0.95]"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick Topics Panel ── */}
        {topicsVisible && (
          <div className="hidden lg:flex w-[260px] shrink-0 flex-col">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex-1">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-bold text-foreground">Quick topics</h2>
              </div>
              <div className="p-2 space-y-0.5">
                {QUICK_TOPICS.map((topic) => (
                  <button
                    key={topic.label}
                    onClick={() => handleQuickTopic(topic.label)}
                    disabled={sending}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left text-foreground hover:bg-primary/[0.04] transition-colors disabled:opacity-50 active:scale-[0.98]"
                  >
                    <span className="text-base shrink-0">{topic.icon}</span>
                    {topic.label}
                  </button>
                ))}
              </div>

              {/* Study tip */}
              <div className="m-3 p-3 rounded-xl bg-highlight/10 border border-highlight/20">
                <p className="text-xs font-bold text-primary mb-1">Study tip</p>
                <p className="text-xs text-text-2 leading-relaxed">
                  Practice with the AI Tutor for 15 min daily to improve your score by up to 100 points.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
