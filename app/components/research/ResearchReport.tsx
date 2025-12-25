'use client';

import { motion } from 'framer-motion';
import { ResearchReport as ResearchReportType } from '@/types/research';
import { FileText, Download } from 'lucide-react';

interface ResearchReportProps {
    report: ResearchReportType;
}

export function ResearchReport({ report }: ResearchReportProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 max-w-4xl mx-auto shadow-2xl"
        >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <FileText className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{report.title}</h1>
                        <p className="text-zinc-400 text-sm">Research Proposal & Theoretical Framework</p>
                    </div>
                </div>
                <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export PDF
                </button>
            </div>

            <div className="prose prose-invert prose-zinc max-w-none">
                <div className="bg-zinc-900/50 p-6 rounded-xl border border-white/5 mb-8">
                    <h3 className="text-purple-300 text-sm uppercase tracking-wider font-semibold mb-2">Abstract</h3>
                    <p className="text-zinc-300 leading-relaxed italic">{report.summary}</p>
                </div>

                {report.sections.map((section, idx) => (
                    <section key={idx} className="mb-8">
                        <h2 className="text-xl font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                            <span className="text-purple-500/50 font-mono text-sm">0{idx + 1}.</span>
                            {section.heading}
                        </h2>
                        <div className="text-zinc-300 leading-7 whitespace-pre-wrap">
                            {section.content}
                        </div>
                    </section>
                ))}

                {report.references && report.references.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-white/10">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">References</h3>
                        <ul className="space-y-2">
                            {report.references.map((ref, i) => (
                                <li key={i} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                                    [{i + 1}] {ref}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
