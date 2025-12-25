'use client';

import { motion } from 'framer-motion';
import { ResearchIdea } from '@/types/research';
import { cn } from '@/lib/utils';
import { Target, Lightbulb, Zap, TrendingUp } from 'lucide-react';

interface ResearchCardProps {
    idea: ResearchIdea;
    isSelected?: boolean;
    isEvaluating?: boolean;
}

export function ResearchCard({ idea, isSelected, isEvaluating }: ResearchCardProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
                opacity: 1,
                scale: 1,
                borderColor: isSelected ? 'rgba(168, 85, 247, 0.5)' : 'rgba(255, 255, 255, 0.05)',
                backgroundColor: isSelected ? 'rgba(168, 85, 247, 0.05)' : 'rgba(255, 255, 255, 0.02)'
            }}
            className={cn(
                "relative p-6 rounded-2xl border backdrop-blur-sm transition-all duration-300",
                isSelected ? "shadow-lg shadow-purple-500/10" : "hover:bg-white/[0.04]"
            )}
        >
            {isSelected && (
                <div className="absolute -top-3 -right-3">
                    <span className="relative flex h-6 w-6">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-6 w-6 bg-purple-500 items-center justify-center">
                            <Target className="w-3 h-3 text-white" />
                        </span>
                    </span>
                </div>
            )}

            <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-white/5">
                    <Lightbulb className="w-5 h-5 text-yellow-500/80" />
                </div>
                {idea.totalScore && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-end"
                    >
                        <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {idea.totalScore}
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Score</span>
                    </motion.div>
                )}
            </div>

            <h3 className="text-lg font-semibold text-zinc-200 mb-2 leading-tight">
                {idea.title}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                {idea.description}
            </p>

            {idea.noveltyScore && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2 pt-4 border-t border-white/5"
                >
                    <ScoreBar label="Novelty" score={idea.noveltyScore} icon={Zap} color="text-yellow-400" />
                    <ScoreBar label="Feasibility" score={idea.feasibilityScore!} icon={Target} color="text-blue-400" />
                    <ScoreBar label="Impact" score={idea.impactScore!} icon={TrendingUp} color="text-green-400" />

                    {idea.reasoning && (
                        <p className="text-xs text-zinc-500 italic mt-3 border-l-2 border-white/10 pl-3">
                            "{idea.reasoning}"
                        </p>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
}

function ScoreBar({ label, score, icon: Icon, color }: { label: string, score: number, icon: any, color: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-24">
                <Icon className={cn("w-3 h-3", color)} />
                <span className="text-xs text-zinc-400">{label}</span>
            </div>
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score * 10}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={cn("h-full rounded-full opacity-60", color.replace('text-', 'bg-'))}
                />
            </div>
            <span className="text-xs font-mono text-zinc-500 w-6 text-right">{score}</span>
        </div>
    );
}
