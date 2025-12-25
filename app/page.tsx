'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, Play, LayoutDashboard, Cpu, FileText, Settings, FlaskConical, Zap, TrendingUp, RotateCcw } from 'lucide-react';
import { ResearchCard } from './components/research/ResearchCard';
import { ResearchLog } from './components/research/ResearchLog';
import { ResearchReport } from './components/research/ResearchReport';
import { ResearchState, ResearchIdea, ResearchUpdate } from '@/types/research';
import { cn } from '@/lib/utils';

export default function ResearchDashboard() {
  const [isInputting, setIsInputting] = useState(true);
  const [topic, setTopic] = useState('');
  const [chatInput, setChatInput] = useState('');
  const transcriptRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<ResearchState>({
    phase: 'initial',
    topic: '',
    ideas: [],
    logs: [],
    debugLogs: [],
    thoughts: [],
    tasks: [],
    papers: [],
    transcript: '',
    messages: [],
    aiHistory: [],
    executionMode: 'fast',
    isResearchMode: false,
    pendingToolCalls: [],
    resources: {
      gpus: [
        { id: 'gpu-1', name: 'NVIDIA H100', utilization: 0, memory: '80GB' },
        { id: 'gpu-2', name: 'NVIDIA H100', utilization: 0, memory: '80GB' },
      ]
    }
  });

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [state.transcript, state.messages, state.thoughts]);

  const [activeTab, setActiveTab] = useState<'research' | 'resources' | 'literature' | 'reports' | 'settings'>('research');

  const [selectedProvider, setSelectedProvider] = useState<'openrouter' | 'google'>('openrouter');
  const [selectedModel, setSelectedModel] = useState('nvidia/nemotron-3-nano-30b-a3b:free');

  const models = {
    openrouter: [
      { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron-3 Nano 30B (Free)' },
      { id: 'mistralai/devstral-2512:free', label: 'Devstral 2512 (Free)' },
      { id: 'nex-agi/deepseek-v3.1-nex-n1:free', label: 'DeepSeek V3.1 Nex-N1 (Free)' },
      { id: 'arcee-ai/trinity-mini:free', label: 'Trinity Mini (Free)' },
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
      phase: 'chatting',
      isResearchMode: false,
      transcript: '',
      aiHistory: [],
      logs: ['Opening discussion channel...'],
      messages: [{
        id: `u-${Date.now()}`,
        role: 'user',
        content: `I'm interested in: ${topic}. Tell me more about it before we start research.`,
        type: 'text'
      }]
    }));

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          mode: 'start',
          provider: selectedProvider,
          model: selectedModel,
          executionMode: state.executionMode,
          isResearchMode: false,
          history: [{ role: 'user', content: `I'm interested in: ${topic}. Tell me more about it before we start research.` }]
        }),
      });

      if (!response.ok) throw new Error('Failed to start discussion');
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

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user' as const,
      content: chatInput,
      type: 'text' as const
    };

    setState(prev => {
      const nextMessages = [...(prev.messages || []), userMsg];
      const nextAiHistory = [...(prev.aiHistory || []), { role: 'user', content: chatInput }];

      // We need to call API here
      fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: state.topic,
          mode: 'start',
          provider: selectedProvider,
          model: selectedModel,
          executionMode: state.executionMode,
          isResearchMode: state.isResearchMode,
          history: nextAiHistory
        }),
      }).then(readStream);

      return {
        ...prev,
        messages: nextMessages,
        aiHistory: nextAiHistory
      };
    });
    setChatInput('');
  };

  const initiateResearch = async () => {
    setState(prev => ({
      ...prev,
      phase: 'brainstorming',
      isResearchMode: true,
      logs: [...prev.logs, 'Initializing autonomous research pipeline...'],
      messages: [...prev.messages, {
        id: `u-init-${Date.now()}`,
        role: 'user',
        content: 'Let\'s start the research and use tools now.',
        type: 'text'
      }],
      aiHistory: [...prev.aiHistory, { role: 'user', content: 'Let\'s start the research and use tools now.' }]
    }));

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: state.topic,
          mode: 'start',
          provider: selectedProvider,
          model: selectedModel,
          executionMode: state.executionMode,
          isResearchMode: true,
          history: [...state.aiHistory, { role: 'user', content: 'Let\'s start the research and use tools now.' }]
        }),
      });

      if (!response.ok) throw new Error('Failed to initiate research');
      await readStream(response);
    } catch (error: any) {
      setState(prev => ({ ...prev, phase: 'error', logs: [...prev.logs, `Error: ${error.message}`] }));
    }
  };

  const resetResearch = () => {
    setIsInputting(true);
    setTopic('');
    setChatInput('');
    setState(prev => ({
      phase: 'initial',
      topic: '',
      ideas: [],
      logs: [],
      debugLogs: [],
      thoughts: [],
      tasks: [],
      papers: [],
      transcript: '',
      messages: [],
      aiHistory: [],
      executionMode: prev.executionMode,
      isResearchMode: false,
      pendingToolCalls: [],
      resources: prev.resources
    }));
  };

  const approvePlan = async () => {
    setState(prev => ({
      ...prev,
      phase: 'brainstorming',
      logs: [...prev.logs, 'Plan approved. Starting research loop...'],
      messages: [...(prev.messages || []), {
        id: `u-app-${Date.now()}`,
        role: 'user',
        content: 'I approve this plan. Proceed.',
        type: 'text'
      }]
    }));

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: state.topic,
          mode: 'approve-plan',
          provider: selectedProvider,
          model: selectedModel
        }),
      });

      if (!response.ok) throw new Error('Failed to approve plan');
      await readStream(response);
    } catch (error: any) {
      setState(prev => ({ ...prev, phase: 'error', logs: [...prev.logs, `Error: ${error.message}`] }));
    }
  };

  const executeToolExecution = async (toolCall: any) => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, `Executing tool: ${toolCall.toolName}...`],
      // Add assistant message with tool call to aiHistory
      aiHistory: [...prev.aiHistory, {
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: toolCall.toolCallId,
          type: 'function',
          function: {
            name: toolCall.toolName,
            arguments: JSON.stringify(toolCall.args)
          }
        }]
      }]
    }));

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: state.topic,
          mode: 'call-tool',
          toolCall,
          provider: selectedProvider,
          model: selectedModel
        }),
      });

      if (!response.ok) throw new Error('Tool execution failed');
      await readStream(response);
    } catch (error: any) {
      setState(prev => ({ ...prev, phase: 'error', logs: [...prev.logs, `Error: ${error.message}`] }));
    }
  };

  const continueResearchWithResult = async (history: any[]) => {
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: state.topic,
          mode: 'start',
          history,
          provider: selectedProvider,
          model: selectedModel,
          executionMode: state.executionMode
        }),
      });

      if (!response.ok) throw new Error('Failed to continue research');
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
            } else if (line.startsWith('0:')) {
              const text = JSON.parse(line.slice(2).trim());
              handleTextUpdate(text);
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
        case 'plan':
          next.researchPlan = update.plan;
          break;
        case 'tool-call':
          next.pendingToolCalls = [...(prev.pendingToolCalls || []), update.toolCall];
          break;
        case 'tool-result':
          // Result of a tool call
          next.pendingToolCalls = (prev.pendingToolCalls || []).filter(tc => tc.toolCallId !== update.toolCallId);
          // Add to aiHistory for next turn
          const resultMsg = { role: 'tool', toolCallId: update.toolCallId, content: JSON.stringify(update.result) };
          next.aiHistory = [...(prev.aiHistory || []), resultMsg];
          // Automatically continue research loop with results
          setTimeout(() => continueResearchWithResult(next.aiHistory), 500);
          break;
        case 'thought':
          next.thoughts = [...(prev.thoughts || []), update.thought];
          next.logs = [...prev.logs, update.thought.content];
          next.transcript = ''; // Clear live stream after persistent thought is added
          // Also add to aiHistory
          next.aiHistory = [...(prev.aiHistory || []), { role: 'assistant', content: update.thought.content }];
          break;
        case 'message':
          next.messages = [...(prev.messages || []), update.message];
          break;
        case 'error':
          next.logs = [...prev.logs, `ERROR: ${update.message}`];
          break;
      }
      return next;
    });
  };

  const handleTextUpdate = (text: string) => {
    setState(prev => ({
      ...prev,
      transcript: prev.transcript + text
    }));
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
            badge={state.papers.length > 0 ? state.papers.length : undefined}
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
              <button
                onClick={resetResearch}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-400 transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New Research
              </button>
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

              <div className="flex bg-white/[0.03] border border-white/10 rounded-2xl p-1.5 mb-8 w-64">
                <button
                  onClick={() => setState(prev => ({ ...prev, executionMode: 'plan' }))}
                  className={cn("flex-1 py-2 px-4 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all", state.executionMode === 'plan' ? "bg-purple-600 text-white shadow-xl shadow-purple-500/20" : "text-zinc-500 hover:text-zinc-300")}
                >
                  Plan
                </button>
                <button
                  onClick={() => setState(prev => ({ ...prev, executionMode: 'fast' }))}
                  className={cn("flex-1 py-2 px-4 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all", state.executionMode === 'fast' ? "bg-purple-600 text-white shadow-xl shadow-purple-500/20" : "text-zinc-500 hover:text-zinc-300")}
                >
                  Fast
                </button>
              </div>

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
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Chat Messages Area */}
                    <div className="flex-1 overflow-y-auto pr-2 pb-6 space-y-6 scrollbar-hide" ref={transcriptRef}>
                      {state.messages.length === 0 && !state.transcript && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                          <Loader2 className="w-8 h-8 animate-spin mb-4" />
                          <p className="text-sm font-medium tracking-widest uppercase">Initializing Agent...</p>
                        </div>
                      )}

                      {/* Unified Chat History */}
                      {state.messages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn("flex gap-4 max-w-3xl", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0",
                            msg.role === 'user' ? "bg-blue-500/10 border-blue-500/30" : "bg-purple-500/20 border-purple-500/30"
                          )}>
                            {msg.role === 'user' ? <LayoutDashboard className="w-4 h-4 text-blue-400" /> : <Cpu className="w-4 h-4 text-purple-400" />}
                          </div>
                          <div className={cn(
                            "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                            msg.role === 'user' ? "bg-blue-600/10 border border-blue-500/20 text-zinc-200 rounded-tr-none" : "bg-white/5 border border-white/10 text-zinc-300 rounded-tl-none"
                          )}>
                            {msg.content}
                          </div>
                        </motion.div>
                      ))}

                      {/* Thoughts / Reasoning in Chat */}
                      {state.thoughts.map((thought, i) => (
                        <motion.div
                          key={thought.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex gap-4 max-w-3xl"
                        >
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5 flex-shrink-0">
                            <Zap className="w-4 h-4 text-zinc-500" />
                          </div>
                          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 text-zinc-400 text-xs italic leading-relaxed font-mono">
                            {thought.content}
                          </div>
                        </motion.div>
                      ))}

                      {/* Live Streaming Content */}
                      {state.transcript && (
                        <div className="flex gap-4 max-w-3xl">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30 flex-shrink-0">
                            <Cpu className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-zinc-300 text-sm leading-relaxed font-mono whitespace-pre-wrap">
                            {state.transcript}
                            <motion.span
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{ repeat: Infinity, duration: 0.8 }}
                              className="inline-block w-2 h-4 bg-purple-500 ml-1 translate-y-0.5"
                            />
                          </div>
                        </div>
                      )}

                      {/* Pending Tool Calls */}
                      {state.pendingToolCalls && state.pendingToolCalls.length > 0 && (
                        <div className="space-y-4 pt-4">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-12">
                            <Settings className="w-3 h-3" /> System Action Required
                          </div>
                          <div className="pl-12 space-y-3">
                            {state.pendingToolCalls.map((tc, idx) => (
                              <motion.div
                                key={tc.toolCallId || idx}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-xl group"
                              >
                                <div className="flex items-start justify-between mb-4">
                                  <div>
                                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                                      Tool Suggestion: <span className="text-purple-400">{tc.toolName}</span>
                                    </h4>
                                    <p className="text-[10px] text-zinc-500 font-mono">
                                      {JSON.stringify(tc.args, null, 2)}
                                    </p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-zinc-800/50 border border-white/5 group-hover:border-purple-500/30 transition-colors">
                                    <Cpu className="w-4 h-4 text-purple-400" />
                                  </div>
                                </div>
                                <button
                                  onClick={() => executeToolExecution(tc)}
                                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
                                >
                                  Execute Tool <Play className="w-3 h-3 fill-current" />
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Display Results as Cards in Chat Flow */}
                      {state.ideas.length > 0 && (
                        <div className="space-y-4 pt-4">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-12">
                            <Sparkles className="w-3 h-3" /> Potential Research Frontiers
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-12">
                            {state.ideas.filter(i => i.status !== 'rejected').map(idea => (
                              <div key={idea.id} onClick={() => {
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
                          </div>
                        </div>
                      )}

                      {state.report && (
                        <div className="pl-12 pt-8">
                          <ResearchReport report={state.report} />
                        </div>
                      )}

                      {/* Plan Approval Trigger */}
                      {state.phase === 'awaiting-plan-approval' && (
                        <div className="flex justify-center py-6">
                          <button
                            onClick={() => approvePlan()}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-2xl font-bold shadow-2xl shadow-purple-500/40 flex items-center gap-3 transform hover:scale-105 transition-all"
                          >
                            Approve & Start Research <Play className="w-5 h-5 fill-current" />
                          </button>
                        </div>
                      )}

                      {/* Initial Chatting to Research Trigger */}
                      {state.phase === 'chatting' && (
                        <div className="flex justify-center py-6">
                          <button
                            onClick={() => initiateResearch()}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl shadow-purple-500/40 flex items-center gap-3 transform hover:scale-105 transition-all group"
                          >
                            <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                            Start Autonomous Research Pipeline
                          </button>
                        </div>
                      )}

                      {/* Execution Trigger in Flow */}
                      {state.phase === 'awaiting-selection' && state.selectedIdeaId && (
                        <div className="flex justify-center py-6">
                          <button
                            onClick={() => proceedWithSelection()}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-2xl font-bold shadow-2xl shadow-purple-500/40 flex items-center gap-3 transform hover:scale-105 transition-all"
                          >
                            Execute Deep Research <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Chat Input at Bottom */}
                    <div className="pt-4 border-t border-white/5">
                      <div className="relative group">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                          placeholder="Ask the agent anything..."
                          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-zinc-300 focus:outline-none focus:border-purple-500/50 transition-all pr-16"
                        />
                        <button
                          onClick={handleChatSubmit}
                          disabled={!chatInput.trim()}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-500 transition-all disabled:opacity-50"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
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

function NavButton({ icon, label, active, onClick, disabled, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, disabled?: boolean, badge?: number }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
        active
          ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] border border-transparent",
        disabled && "opacity-40 cursor-not-allowed grayscale"
      )}
    >
      <div className="flex items-center gap-3">
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
      </div>
      {badge && (
        <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}
