'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, Play } from 'lucide-react';
import { ResearchCard } from './components/research/ResearchCard';
import { ResearchLog } from './components/research/ResearchLog';
import { ResearchReport } from './components/research/ResearchReport';
import { ResearchState, ResearchIdea, ResearchUpdate } from '@/types/research';
import { cn } from '@/lib/utils';

export default function ResearchDashboard() {
  const [isInputting, setIsInputting] = useState(true);
  const [topic, setTopic] = useState('');
  const [state, setState] = useState<ResearchState>({
    phase: 'initial',
    topic: '',
    ideas: [],
    logs: [],
  });

  const startResearch = async () => {
    if (!topic.trim()) return;

    setIsInputting(false);
    setState(prev => ({ ...prev, topic, phase: 'brainstorming', logs: ['Initializing research agent...'] }));

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) throw new Error('Failed to start research');

      const reader = response.body?.getReader();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        // The stream might contain multiple JSON objects concatenated
        // We need to parse them carefully
        // Note: AI SDK's createDataStreamResponse sends chunks in a specific format
        // Usually line-delimited or special format.
        // Let's assume simplest custom line-delimited JSON for now 
        // OR better: handle the specific format if known.
        // Actually, createDataStreamResponse expects us to use useChat or useCompletion usually,
        // but here we did a custom stream. Let's try raw parsing.

        // Handling potentially split chunks (basic implementation)
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            // The AI SDK might prefix with "0:" for text or similar.
            // But our custom writeData sends raw JSON objects stringified if using standard stream plumbing.
            // However, createDataStreamResponse wraps it.
            // Let's rely on manual parsing of the 'data' part if it's the Vercel protocol
            // Or if we just did raw strings.

            // If the API uses dataStream.writeData, it formats it as:
            // 2: [...] (for data)
            // We need to parse that.

            if (line.startsWith('2:')) {
              const jsonStr = line.slice(2); // Remove prefix
              const update = JSON.parse(JSON.parse(jsonStr)) as ResearchUpdate; // It's double stringified usually
              handleUpdate(update);
            }
          } catch (e) {
            console.warn('Failed to parse chunk:', line, e);
          }
        }
      }
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, phase: 'error', logs: [...prev.logs, 'Error occurred during research.'] }));
    }
  };

  const handleUpdate = (update: ResearchUpdate) => {
    setState(prev => {
      const next = { ...prev };

      switch (update.type) {
        case 'phase':
          next.phase = update.phase;
          break;
        case 'log':
          next.logs = [...prev.logs, update.message];
          break;
        case 'ideas':
          next.ideas = update.ideas;
          break;
        case 'selection': // Update selection
          next.selectedIdeaId = update.ideaId;
          break;
        case 'report':
          next.report = update.report;
          break;
        case 'error':
          next.logs = [...prev.logs, `ERROR: ${update.message}`];
          break;
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-purple-500/30 overflow-hidden flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/[0.08] bg-black/20 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 blur opacity-40 animate-pulse" />
            <div className="relative p-2 bg-black rounded-full border border-white/10">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              AutoResearcher.ai
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Autonomous Agent v1.0</p>
          </div>
        </div>

        {state.phase !== 'initial' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            {state.phase.replace('-', ' ').toUpperCase()}
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col relative">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
        </div>

        {isInputting ? (
          // Input View
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-6 bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              What should we research?
            </h2>
            <p className="text-zinc-500 text-center mb-10 text-lg max-w-lg">
              Enter a topic, and I will autonomously generate hypothesis, evaluate feasibility, and write a research proposal.
            </p>

            <div className="w-full relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
              <div className="relative flex items-center bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && startResearch()}
                  placeholder="e.g., 'Quantum computing for drug discovery'..."
                  className="flex-1 bg-transparent border-none outline-none text-lg px-4 py-3 text-white placeholder-zinc-600"
                  autoFocus
                />
                <button
                  onClick={startResearch}
                  disabled={!topic.trim()}
                  className="p-3 bg-white text-black rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          // Research View
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden h-full">

            {/* Left Panel: Ideas & Cards */}
            <div className="lg:col-span-2 overflow-y-auto pr-2 pb-20 scrollbar-hide">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold mb-2 text-zinc-200">
                  {state.phase === 'complete' ? 'Research Findings' : 'Generating Hypotheses...'}
                </h3>
                <p className="text-zinc-500 text-sm">
                  {state.phase === 'brainstorming' && "Brainstorming potential research directions based on your topic."}
                  {state.phase === 'evaluating' && "Critically analyzing each idea for score and viability."}
                  {state.phase === 'deep-diving' && "Expansion and detailed writing for the selected candidate."}
                  {state.phase === 'complete' && "Final report ready."}
                </p>
              </div>

              {state.report ? (
                <ResearchReport report={state.report} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {state.ideas.map((idea, i) => (
                      <ResearchCard
                        key={idea.id || i}
                        idea={idea}
                        isSelected={state.selectedIdeaId === idea.id}
                        isEvaluating={state.phase === 'evaluating'}
                      />
                    ))}
                  </AnimatePresence>
                  {state.ideas.length === 0 && (
                    <div className="col-span-2 flex flex-col items-center justify-center py-20 opacity-50">
                      <Loader2 className="w-8 h-8 animate-spin mb-4" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Panel: Logs & terminal */}
            <div className="lg:col-span-1 h-[400px] lg:h-auto lg:sticky lg:top-6">
              <ResearchLog logs={state.logs} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
