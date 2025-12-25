'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Bug, ChevronRight, ChevronDown } from 'lucide-react';
import { ResearchDebugLog } from '@/types/research';
import { cn } from '@/lib/utils';

interface ResearchLogProps {
    logs: string[];
    debugLogs?: ResearchDebugLog[];
}

export function ResearchLog({ logs, debugLogs = [] }: ResearchLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState<'simple' | 'debug'>('simple');
    const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, debugLogs, mode]); // Scroll when any content changes

    const toggleLog = (id: string) => {
        setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="rounded-xl border border-white/10 bg-black/50 overflow-hidden flex flex-col h-full max-h-[calc(100vh-100px)]">
            <div className="flex items-center gap-2 px-2 py-2 border-b border-white/5 bg-white/[0.02]">
                <button
                    onClick={() => setMode('simple')}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2",
                        mode === 'simple' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    <Terminal className="w-3.5 h-3.5" />
                    Console
                </button>
                <button
                    onClick={() => setMode('debug')}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2",
                        mode === 'debug' ? "bg-purple-500/20 text-purple-300" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    <Bug className="w-3.5 h-3.5" />
                    API Trace
                </button>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono text-xs scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
            >
                <AnimatePresence initial={false} mode="wait">
                    {mode === 'simple' ? (
                        <motion.div
                            key="simple"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-1.5"
                        >
                            {logs.map((log, index) => (
                                <div key={index} className="text-zinc-400 break-words flex gap-2">
                                    <span className="text-zinc-600 shrink-0">
                                        {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    <span className={index === logs.length - 1 ? "text-green-400" : ""}>
                                        {log}
                                    </span>
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="debug"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                        >
                            {debugLogs.map((log) => (
                                <div key={log.id} className="border border-white/5 rounded-lg bg-white/[0.02] overflow-hidden">
                                    <button
                                        onClick={() => toggleLog(log.id)}
                                        className="w-full flex items-center gap-2 p-2 hover:bg-white/5 transition-colors text-left"
                                    >
                                        {expandedLogs[log.id] ? (
                                            <ChevronDown className="w-3 h-3 text-zinc-500" />
                                        ) : (
                                            <ChevronRight className="w-3 h-3 text-zinc-500" />
                                        )}

                                        <span className={cn(
                                            "uppercase text-[10px] font-bold px-1.5 py-0.5 rounded",
                                            log.type === 'call' ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                                        )}>
                                            {log.type}
                                        </span>
                                        <span className="text-zinc-400 truncate flex-1">{log.step}</span>
                                        <span className="text-[10px] text-zinc-600">
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </button>

                                    {expandedLogs[log.id] && (
                                        <div className="p-3 border-t border-white/5 bg-black/40 text-zinc-300 whitespace-pre-wrap overflow-x-auto">
                                            {log.content}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {logs.length === 0 && debugLogs.length === 0 && (
                        <span className="text-zinc-700 italic">Waiting for input...</span>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
