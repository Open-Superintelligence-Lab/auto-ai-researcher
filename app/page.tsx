'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Cpu, LayoutDashboard, Play, FlaskConical } from 'lucide-react';
import { ResearchState, ResearchUpdate } from '@/types/research';
import { MarkdownRenderer } from './components/MarkdownRenderer';

export default function ResearchDashboard() {
  const [chatInput, setChatInput] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<ResearchState>({
    messages: [],
    papers: [],
    ideas: [],
    pendingToolCalls: [],
    transcript: '',
  });

  const [selectedProvider, setSelectedProvider] = useState<'openrouter' | 'google'>('openrouter');
  const [selectedModel, setSelectedModel] = useState('nvidia/nemotron-3-nano-30b-a3b:free');

  const models = {
    openrouter: [
      { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron-3 Nano 30B (Free)' },
      { id: 'mistralai/devstral-2512:free', label: 'Devstral 2512 (Free)' },
      { id: 'nex-agi/deepseek-v3.1-nex-n1:free', label: 'DeepSeek V3.1 Nex-N1 (Free)' },
    ],
    google: [
      { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
      { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash' },
    ]
  };

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [state.messages, state.transcript]);

  const handleSend = async () => {
    if (!chatInput.trim()) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user' as const,
      content: chatInput,
    };

    const newMessages = [...state.messages, userMsg];
    setState(prev => ({ ...prev, messages: newMessages }));
    setChatInput('');

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          provider: selectedProvider,
          model: selectedModel,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      await readStream(response);
    } catch (error: any) {
      console.error('Error:', error);
    }
  };

  const executeTool = async (toolCall: any) => {
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolCall,
          provider: selectedProvider,
          model: selectedModel,
        }),
      });

      if (!response.ok) throw new Error('Tool execution failed');
      await readStream(response);
    } catch (error: any) {
      console.error('Error:', error);
    }
  };

  const continueChat = async (history: any[]) => {
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          provider: selectedProvider,
          model: selectedModel,
        }),
      });

      if (!response.ok) throw new Error('Failed to continue');
      await readStream(response);
    } catch (error: any) {
      console.error('Error:', error);
    }
  };

  const readStream = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';
    let streamedText = '';
    let hasToolCalls = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            if (line.startsWith('2:')) {
              const update = JSON.parse(line.slice(2).trim()) as ResearchUpdate;
              if (update.type === 'tool-call') {
                hasToolCalls = true;
              }
              handleUpdate(update);
            } else if (line.startsWith('0:')) {
              const text = JSON.parse(line.slice(2).trim());
              streamedText += text;
              setState(prev => ({ ...prev, transcript: prev.transcript + text }));
            }
          } catch (e) {
            console.warn('Failed to parse chunk:', line, e);
          }
        }
      }
    } finally {
      reader.releaseLock();

      // Convert transcript to actual message if there's text
      if (streamedText) {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: streamedText,
          }],
          transcript: '',
        }));
      }
    }
  };

  const handleUpdate = (update: ResearchUpdate) => {
    setState(prev => {
      const next = { ...prev };

      switch (update.type) {
        case 'ideas':
          next.ideas = update.ideas;
          break;
        case 'papers':
          next.papers = update.papers;
          break;
        case 'tool-call':
          // If we have a transcript, save it as assistant message first so history is correct
          if (prev.transcript) {
            next.messages = [...prev.messages, {
              id: `a-${Date.now()}`,
              role: 'assistant' as const,
              content: prev.transcript
            }];
            next.transcript = '';
          }
          next.pendingToolCalls = [...prev.pendingToolCalls, update.toolCall];

          // Auto-execute research tools
          console.log('[UI] Auto-executing tool:', update.toolCall.toolName);
          setTimeout(() => executeTool(update.toolCall), 500);
          break;
        case 'tool-result':
          next.pendingToolCalls = prev.pendingToolCalls.filter(tc => (tc.toolCallId || tc.id) !== update.toolCallId);

          const resultMsg = {
            id: `tr-${Date.now()}`,
            role: 'tool' as any,
            toolCallId: update.toolCallId,
            content: JSON.stringify(update.result)
          };

          next.messages = [...prev.messages, resultMsg];
          // Clear transcript in case there was any
          next.transcript = '';

          // Trigger the continuation
          setTimeout(() => continueChat(next.messages), 100);
          break;
        case 'error':
          console.error('[AGENT ERROR]:', update.message);
          break;
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-black/40 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 blur opacity-40 animate-pulse" />
              <div className="relative p-2 bg-black rounded-full border border-white/10">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              AI Researcher
            </h1>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => {
                const p = e.target.value as any;
                setSelectedProvider(p);
                setSelectedModel(models[p as keyof typeof models][0].id);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none focus:border-purple-500/50 transition-colors"
            >
              <option value="openrouter">OpenRouter</option>
              <option value="google">Google Gemini</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none focus:border-purple-500/50 transition-colors"
            >
              {models[selectedProvider].map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between px-8 py-5 border-b border-white/[0.08] bg-black/20 backdrop-blur-xl">
          <h2 className="text-sm font-medium text-zinc-400">Research Chat</h2>
        </header>

        <main className="flex-1 flex overflow-hidden p-6 gap-6">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 pb-4" ref={messagesRef}>
              {state.messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 shadow-lg ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 ring-1 ring-blue-500/10'
                    : 'bg-gradient-to-br from-purple-500/30 to-purple-600/10 border-purple-500/40 ring-1 ring-purple-500/10 shadow-purple-500/5'
                    }`}>
                    {msg.role === 'user' ? <LayoutDashboard className="w-4.5 h-4.5 text-blue-400" /> : <Cpu className="w-4.5 h-4.5 text-purple-300" />}
                  </div>
                  <div className={`p-5 rounded-2xl text-sm max-w-[85%] leading-relaxed shadow-sm ${msg.role === 'user'
                    ? 'bg-blue-600/10 border border-blue-500/20 rounded-tr-none text-zinc-200'
                    : 'bg-white/[0.03] border border-white/10 rounded-tl-none text-zinc-300 backdrop-blur-sm shadow-black/20'
                    }`}>
                    <MarkdownRenderer content={msg.content} />
                  </div>
                </motion.div>
              ))}

              {state.transcript && (
                <div className="flex gap-5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-600/10 border border-purple-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/5 ring-1 ring-purple-500/10">
                    <Cpu className="w-4.5 h-4.5 text-purple-300" />
                  </div>
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl rounded-tl-none p-5 text-sm max-w-[85%] backdrop-blur-sm shadow-black/20 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500/40 to-transparent" />
                    <MarkdownRenderer content={state.transcript} />
                    <motion.span
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="inline-block w-2.5 h-4.5 bg-purple-500/80 ml-1 rounded-sm align-middle shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                    />
                  </div>
                </div>
              )}

              {state.pendingToolCalls.length > 0 && (
                <div className="space-y-3">
                  {state.pendingToolCalls.map((tc, idx) => (
                    <motion.div
                      key={tc.toolCallId || idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-xl"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                            Tool: <span className="text-purple-400">{tc.toolName}</span>
                          </h4>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            {JSON.stringify(tc.args, null, 2)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => executeTool(tc)}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        Execute <Play className="w-3 h-3 fill-current" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {state.ideas.length > 0 && (
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> Research Ideas
                  </div>
                  {state.ideas.map(idea => (
                    <div key={idea.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <h4 className="text-sm font-bold text-zinc-200 mb-2">{idea.title}</h4>
                      <p className="text-xs text-zinc-400">{idea.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-zinc-300 focus:outline-none focus:border-purple-500/50 transition-all pr-16"
                />
                <button
                  onClick={handleSend}
                  disabled={!chatInput.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition-all disabled:opacity-50"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar for Papers */}
          {state.papers.length > 0 && (
            <div className="w-80 bg-white/[0.02] border border-white/5 rounded-2xl p-4 overflow-y-auto">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FlaskConical className="w-3 h-3" /> Papers Found
              </div>
              <div className="space-y-3">
                {state.papers.slice(0, 10).map(paper => (
                  <div key={paper.id} className="p-3 bg-white/5 border border-white/10 rounded-xl">
                    <h4 className="text-xs font-bold text-zinc-300 mb-1">{paper.title}</h4>
                    <p className="text-[10px] text-zinc-500">{paper.authors[0]} et al. • {paper.year}</p>
                    <div className="mt-2 text-[10px] text-purple-400 font-bold">{paper.relevance}% relevant</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
