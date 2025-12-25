'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, Play, LayoutDashboard, Cpu, FileText, Settings, FlaskConical, Zap, TrendingUp } from 'lucide-react';
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
    debugLogs: [],
    tasks: [],
    papers: [],
    resources: {
      gpus: [
        { id: 'gpu-1', name: 'NVIDIA H100', utilization: 0, memory: '80GB' },
        { id: 'gpu-2', name: 'NVIDIA H100', utilization: 0, memory: '80GB' },
      ]
    }
  });

  const [activeTab, setActiveTab] = useState<'research' | 'resources' | 'literature' | 'reports' | 'settings'>('research');

  const [selectedProvider, setSelectedProvider] = useState<'openrouter' | 'google'>('openrouter');
  const [selectedModel, setSelectedModel] = useState('xiaomi/mimo-v2-flash:free');

  const models = {
    openrouter: [
      { id: 'xiaomi/mimo-v2-flash:free', label: 'MiMo V2 Flash (Free)' },
    ],
    google: [
      { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
      { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ]
  };

  const startResearch = async () => {
    if (!topic.trim()) return;

    setIsInputting(false);
    setState(prev => ({
      ...prev,
      topic,
      phase: 'brainstorming',
      logs: ['Requesting research agent...'],
      ideas: [],
      report: undefined
    }));

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          mode: 'start',
          provider: selectedProvider,
          model: selectedModel
        }),
      });

      if (!response.ok) throw new Error('Failed to start research');
      await readStream(response);
    } catch (error: any) {
      setState(prev => ({ ...prev, phase: 'error', logs: [...prev.logs, `Error: ${error.message}`] }));
    }
  };

  const proceedWithSelection = async () => {
    if (!state.selectedIdeaId) return;

    setState(prev => ({
      ...prev,
      phase: 'evaluating',
      logs: [...prev.logs, 'Proceeding with selected idea...']
    }));

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: state.topic,
          mode: 'proceed',
          selectedId: state.selectedIdeaId,
          ideas: state.ideas,
          provider: selectedProvider,
          model: selectedModel
        }),
      });

      if (!response.ok) throw new Error('Failed to proceed');
      await readStream(response);
    } catch (error: any) {
      setState(prev => ({ ...prev, phase: 'error', logs: [...prev.logs, `Error: ${error.message}`] }));
    }
  };

  const readStream = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

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
              const jsonStr = line.slice(2).trim();
              const update = JSON.parse(jsonStr) as ResearchUpdate;
              handleUpdate(update);
            }
          } catch (e) {
            console.warn('Failed to parse chunk:', line, e);
          }
        }
      }
    } finally {
      reader.releaseLock();
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
        case 'debug':
          next.debugLogs = [...(prev.debugLogs || []), update.log];
          break;
        case 'ideas':
          next.ideas = update.ideas;
          break;
        case 'tasks':
          next.tasks = update.tasks;
          break;
        case 'papers':
          next.papers = update.papers;
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
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-purple-500/30 overflow-hidden">

      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/5 bg-black/40 flex flex-col z-20">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 blur opacity-40 animate-pulse" />
              <div className="relative p-2 bg-black rounded-full border border-white/10">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Lab OS
            </h1>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavButton
            active={activeTab === 'research'}
            onClick={() => setActiveTab('research')}
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Research"
          />
          <NavButton
            active={activeTab === 'resources'}
            onClick={() => setActiveTab('resources')}
            icon={<Cpu className="w-4 h-4" />}
            label="GPU Lab"
          />
          <NavButton
            active={activeTab === 'literature'}
            onClick={() => setActiveTab('literature')}
            icon={<FlaskConical className="w-4 h-4" />}
            label="Literature"
          />
          <NavButton
            active={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
            icon={<FileText className="w-4 h-4" />}
            label="Archives"
            disabled
          />
          <NavButton
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={<Settings className="w-4 h-4" />}
            label="Settings"
            disabled
          />
        </nav>

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

        <div className="p-4 border-t border-white/5 space-y-4">
          <div className="px-4 py-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Alpha Access</span>
            </div>
            <p className="text-[10px] text-zinc-500">Autonomous researcher is online and ready.</p>
          </div>

          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-500 border border-white/10" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-zinc-300">Principal Investigator</p>
              <p className="text-[10px] text-zinc-500 truncate">lab@auto-research.ai</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-white/[0.08] bg-black/20 backdrop-blur-xl h-20">
          <div>
            <h2 className="text-sm font-medium text-zinc-400">
              {activeTab === 'research' && "Research Dashboard"}
              {activeTab === 'resources' && "Hardware Control Center"}
              {activeTab === 'literature' && "Literature Discovery"}
              {activeTab === 'reports' && "Archived Proposals"}
              {activeTab === 'settings' && "System Configuration"}
            </h2>
          </div>

          {state.phase !== 'initial' && (
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-400 tracking-tighter uppercase">
                PID: {Math.floor(Math.random() * 90000 + 10000)}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                {state.phase.replace('-', ' ').toUpperCase()}
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 flex flex-col relative overflow-hidden">
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
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 overflow-hidden h-full">

              {/* Main Content Area */}
              <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
                {activeTab === 'research' ? (
                  <div className="flex-1 overflow-y-auto pr-2 pb-20 scrollbar-hide">
                    {/* Autonomous Status Bar */}
                    <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                          <LayoutDashboard className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Active Tasks</p>
                          <p className="text-lg font-bold text-zinc-200">{state.tasks.length || 0}</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Papers Indexed</p>
                          <p className="text-lg font-bold text-zinc-200">{state.papers.length || 0}</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Est. Iterations</p>
                          <p className="text-lg font-bold text-zinc-200">12</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6 flex items-end justify-between">
                      <div>
                        <h3 className="text-2xl font-semibold mb-2 text-zinc-200">
                          {state.phase === 'complete' ? 'Research Findings' : 'Research Pipeline'}
                        </h3>
                        <p className="text-zinc-500 text-sm">
                          {state.phase === 'brainstorming' && "Agent is ideating novel contributions."}
                          {state.phase === 'awaiting-selection' && "Select a high-relevance hypothesis to proceed."}
                          {state.phase === 'evaluating' && "Running automated feasibility checks."}
                          {state.phase === 'deep-diving' && "Expansion using retrieved context."}
                        </p>
                      </div>

                      {state.phase === 'awaiting-selection' && state.selectedIdeaId && (
                        <motion.button
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          onClick={() => proceedWithSelection()}
                          className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl font-medium shadow-lg shadow-purple-500/20 flex items-center gap-2"
                        >
                          Execute Research <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>

                    {state.report ? (
                      <ResearchReport report={state.report} />
                    ) : (
                      <div className="flex flex-col gap-6">
                        {state.tasks.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Active Task Queue</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {state.tasks.map(task => (
                                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                  <div className="flex items-center gap-2">
                                    {task.status === 'running' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />}
                                    <span className="text-xs font-medium text-zinc-300">{task.label}</span>
                                  </div>
                                  <span className={cn(
                                    "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                    task.status === 'running' ? "bg-purple-500/20 text-purple-400" : "bg-black/20 text-zinc-500"
                                  )}>{task.status}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <AnimatePresence>
                            {state.ideas.filter(i => i.status !== 'rejected').map((idea, i) => (
                              <div key={idea.id || i} onClick={() => {
                                if (state.phase === 'awaiting-selection') {
                                  setState(prev => ({ ...prev, selectedIdeaId: idea.id }));
                                }
                              }} className="cursor-pointer">
                                <ResearchCard
                                  idea={idea}
                                  isSelected={state.selectedIdeaId === idea.id}
                                  isEvaluating={state.phase === 'evaluating'}
                                  showControls={state.phase === 'awaiting-selection'}
                                  onDiscard={() => {
                                    setState(prev => ({
                                      ...prev,
                                      ideas: prev.ideas.map(id => id.id === idea.id ? { ...id, status: 'rejected' } : id),
                                      selectedIdeaId: prev.selectedIdeaId === idea.id ? undefined : prev.selectedIdeaId
                                    }));
                                  }}
                                />
                              </div>
                            ))}
                          </AnimatePresence>
                          {state.ideas.length === 0 && (
                            <div className="col-span-2 flex flex-col items-center justify-center py-20 opacity-50">
                              <Loader2 className="w-8 h-8 animate-spin mb-4" />
                              <span className="text-sm">Initializing pipeline...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : activeTab === 'literature' ? (
                  <div className="flex-1 overflow-y-auto pr-2 pb-20 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-semibold text-zinc-200">Discovered Literature</h3>
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 transition-all">Refine Search</button>
                    </div>
                    <div className="space-y-4">
                      {state.papers.map(paper => (
                        <div key={paper.id} className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
                          <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1 flex-1">
                              <h4 className="text-lg font-bold text-zinc-200 group-hover:text-purple-400 transition-colors cursor-pointer">{paper.title}</h4>
                              <p className="text-xs text-zinc-500">{paper.authors.join(', ')} • {paper.year}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-end">
                                <span className="text-lg font-bold text-zinc-400">{paper.relevance}%</span>
                                <span className="text-[8px] text-zinc-600 uppercase tracking-widest font-bold">RELEVANCE</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-zinc-400 line-clamp-2 mb-4 leading-relaxed italic border-l border-white/10 pl-4">{paper.summary}</p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                              <TrendingUp className="w-3 h-3 text-zinc-600" />
                              {paper.citationCount} Citations
                            </div>
                            <a href={paper.url} target="_blank" className="text-[10px] font-bold text-purple-400 uppercase tracking-widest hover:text-purple-300 transition-colors">View Source</a>
                          </div>
                        </div>
                      ))}
                      {state.papers.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-white/5 rounded-3xl opacity-30">
                          <FlaskConical className="w-12 h-12 mb-4" />
                          <p className="text-sm font-medium tracking-widest uppercase">No papers indexed yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeTab === 'resources' ? (
                  <div className="flex-1 overflow-y-auto pr-2 pb-20 space-y-6">
                    <h3 className="text-2xl font-semibold text-zinc-200">Hardware Resources</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {state.resources.gpus.map(gpu => (
                        <div key={gpu.id} className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                              <Play className="w-5 h-5 text-green-400 rotate-90" />
                            </div>
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-green-500/10 text-green-400 uppercase tracking-wider">Online</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">{gpu.id}</h4>
                            <p className="text-xl font-bold text-zinc-100">{gpu.name}</p>
                          </div>
                          <div className="space-y-1.5 pt-4 border-t border-white/5">
                            <div className="flex justify-between text-xs text-zinc-500">
                              <span>Utilization</span>
                              <span>{state.phase !== 'initial' && state.phase !== 'complete' ? Math.floor(Math.random() * 30 + 15) : 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                animate={{ width: state.phase !== 'initial' && state.phase !== 'complete' ? '35%' : '0%' }}
                                className="h-full bg-green-500/50 transition-all duration-1000"
                              />
                            </div>
                            <div className="flex justify-between text-xs text-zinc-500 pt-2">
                              <span>Memory</span>
                              <span>Used: 0GB / {gpu.memory}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Right Panel Logs */}
              <div className="lg:col-span-1 h-[400px] lg:h-auto overflow-hidden">
                <ResearchLog logs={state.logs} debugLogs={state.debugLogs} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick, disabled }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
        active
          ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] border border-transparent",
        disabled && "opacity-40 cursor-not-allowed grayscale"
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 bg-purple-500/5 rounded-xl -z-10"
        />
      )}
      <span className={cn("transition-colors", active ? "text-purple-400" : "group-hover:text-zinc-300")}>
        {icon}
      </span>
      {label}
    </button>
  );
}
