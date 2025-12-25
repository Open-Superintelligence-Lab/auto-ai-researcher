'use client';

import { useChat } from '@ai-sdk/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const { messages, status, sendMessage, setMessages } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-purple-500/30">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-black/20 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 blur opacity-40 animate-pulse" />
            <div className="relative p-2 bg-black rounded-full border border-white/10">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              MiMo AI
            </h1>
            <p className="text-xs text-zinc-500 font-medium">xiaomi/mimo-v2-flash:free</p>
          </div>
        </div>

        <button
          onClick={clearChat}
          className="p-2 transition-all duration-200 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300"
          title="Clear chat"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth px-4 py-8" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[50vh] text-center"
            >
              <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/[0.05] mb-6">
                <Bot className="w-12 h-12 text-zinc-600" />
              </div>
              <h2 className="text-2xl font-semibold text-zinc-200 mb-2">How can I help you today?</h2>
              <p className="text-zinc-500 max-w-sm">
                Start a conversation with the Xiaomi MiMo v2 Flash model.
              </p>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4 group",
                  m.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center border",
                  m.role === 'user'
                    ? "bg-zinc-800 border-white/10"
                    : "bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/20"
                )}>
                  {m.role === 'user' ? (
                    <User className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <Bot className="w-5 h-5 text-purple-400" />
                  )}
                </div>

                <div className={cn(
                  "max-w-[85%] px-5 py-3 rounded-2xl text-[15px] leading-relaxed",
                  m.role === 'user'
                    ? "bg-zinc-900 text-zinc-200 rounded-tr-none border border-white/5"
                    : "bg-white/[0.03] text-zinc-300 rounded-tl-none border border-white/[0.05]"
                )}>
                  {m.parts.map((part, i) => {
                    if (part.type === 'text') return <div key={i}>{part.text}</div>;
                    return null;
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              </div>
              <div className="px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] rounded-tl-none">
                <div className="flex gap-1.5 py-2">
                  <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="px-4 py-8 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-center bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden focus-within:border-purple-500/50 transition-all duration-300 shadow-2xl backdrop-blur-sm"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Message MiMo..."
              className="w-full bg-transparent px-5 py-4 text-zinc-200 placeholder-zinc-500 outline-none resize-none min-h-[56px] max-h-[200px]"
              rows={1}
            />
            <div className="pr-3 pb-3 self-end">
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  input.trim() && !isLoading
                    ? "bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-500/20"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>
          <p className="mt-3 text-center text-[10px] text-zinc-600">
            MiMo AI can make mistakes. Check important info.
          </p>
        </div>
      </footer>
    </div>
  );
}
