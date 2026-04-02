'use client';

import { useState } from 'react';
import { Bot, Send, User, Sparkles } from 'lucide-react';

export default function AITutorPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am your SAT AI Tutor. What would you like to practice today? Math or Reading?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'That sounds great! Let us get started with some practice questions.' }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-100px)] bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-600 p-4 flex items-center gap-3 text-white">
          <div className="p-2 bg-white/20 rounded-lg">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">AI Tutor</h1>
            <p className="text-emerald-100 text-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Powered by advanced SAT models
            </p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-50/50">
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-emerald-600" />
                </div>
              )}
              <div
                className={`max-w-[75%] p-4 rounded-2xl ${
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
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-neutral-200">
          <div className="flex gap-2 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question or request a practice topic..."
              className="flex-1 p-4 pr-12 bg-neutral-100 border-transparent focus:bg-white focus:border-emerald-500 rounded-xl outline-none transition-all"
            />
            <button
              onClick={handleSend}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}