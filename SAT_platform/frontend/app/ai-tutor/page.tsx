'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, Loader2 } from 'lucide-react';
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

export default function AITutorPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

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

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-100px)] bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="bg-emerald-600 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">AI Tutor</h1>
              <p className="text-emerald-100 text-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Powered by Groq Llama 3.3
              </p>
            </div>
          </div>
          {remaining !== null && (
            <div className="text-xs text-emerald-100 bg-white/10 px-3 py-1 rounded-full">
              {remaining} messages left today
            </div>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-50/50">
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-emerald-600" />
                </div>
              )}
              <div
                className={`max-w-[75%] p-4 rounded-2xl whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-sm'
                    : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-sm shadow-sm'
                }`}
              >
                {message.content}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-neutral-600" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl rounded-tl-sm shadow-sm p-4 flex items-center gap-2 text-neutral-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="px-6 py-2 bg-red-50 border-t border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="p-4 bg-white border-t border-neutral-200">
          <div className="flex gap-2 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={sending}
              placeholder="Ask a question or request a practice topic..."
              className="flex-1 p-4 pr-12 bg-neutral-100 border-transparent focus:bg-white focus:border-emerald-500 rounded-xl outline-none transition-all disabled:opacity-60"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
