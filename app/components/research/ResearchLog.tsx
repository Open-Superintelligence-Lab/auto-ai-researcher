'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';

interface ResearchLogProps {
    logs: string[];
}

export function ResearchLog({ logs }: ResearchLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="rounded-xl border border-white/10 bg-black/50 overflow-hidden flex flex-col h-full">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
                <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-500">Research Logs</span>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono text-xs scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
            >
                <AnimatePresence initial={false}>
                    {logs.map((log, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-zinc-400 break-words"
                        >
                            <span className="text-zinc-600 mr-2">
                                {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className={index === logs.length - 1 ? "text-green-400" : ""}>
                                {log}
                            </span>
                        </motion.div>
                    ))}
                    {logs.length === 0 && (
                        <span className="text-zinc-700 italic">Waiting for input...</span>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
