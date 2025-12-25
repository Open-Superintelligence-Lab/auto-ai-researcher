'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    return (
        <div className={`markdown-content ${className} overflow-x-auto first:mt-0 last:mb-0 [&>*]:first:mt-0 [&>*]:last:mb-0`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                components={{
                    h1: ({ children }: { children?: React.ReactNode }) => (
                        <h1 className="text-2xl font-bold mb-4 mt-8 pb-2 border-b border-white/10 text-white tracking-tight">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }: { children?: React.ReactNode }) => (
                        <h2 className="text-xl font-bold mb-3 mt-6 text-zinc-100 tracking-tight">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }: { children?: React.ReactNode }) => (
                        <h3 className="text-lg font-bold mb-2 mt-4 text-zinc-200 tracking-tight">
                            {children}
                        </h3>
                    ),
                    p: ({ children }: { children?: React.ReactNode }) => (
                        <p className="mb-4 leading-relaxed text-zinc-300 last:mb-0 antialiased">
                            {children}
                        </p>
                    ),
                    ul: ({ children }: { children?: React.ReactNode }) => (
                        <ul className="list-disc pl-6 mb-4 space-y-1.5 text-zinc-300">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }: { children?: React.ReactNode }) => (
                        <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-zinc-300">
                            {children}
                        </ol>
                    ),
                    li: ({ children }: { children?: React.ReactNode }) => (
                        <li className="leading-relaxed">
                            {children}
                        </li>
                    ),
                    table: ({ children }: { children?: React.ReactNode }) => (
                        <div className="my-6 overflow-x-auto border border-white/10 rounded-xl bg-white/[0.02] backdrop-blur-sm">
                            <table className="w-full border-collapse text-sm text-zinc-300">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }: { children?: React.ReactNode }) => (
                        <thead className="bg-white/[0.05] border-b border-white/10 text-zinc-100 font-semibold">
                            {children}
                        </thead>
                    ),
                    th: ({ children }: { children?: React.ReactNode }) => (
                        <th className="px-4 py-3 text-left uppercase tracking-wider text-[10px] whitespace-nowrap">
                            {children}
                        </th>
                    ),
                    td: ({ children }: { children?: React.ReactNode }) => (
                        <td className="px-4 py-3 border-b border-white/[0.05] last:border-b-0">
                            {children}
                        </td>
                    ),
                    tr: ({ children }: { children?: React.ReactNode }) => (
                        <tr className="hover:bg-white/[0.02] transition-colors">
                            {children}
                        </tr>
                    ),
                    br: () => <br className="my-4 block" />,
                    code: ({ inline, className, children, ...props }: { inline?: boolean, className?: string, children?: React.ReactNode }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        return inline ? (
                            <code className="bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded-md text-[0.85em] font-mono border border-purple-500/20" {...props}>
                                {children}
                            </code>
                        ) : (
                            <div className="relative group my-6 first:mt-0 last:mb-0">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                <div className="relative">
                                    {match && (
                                        <div className="absolute top-0 right-4 px-2 py-1 bg-white/5 border-x border-b border-white/10 rounded-b-md text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                                            {match[1]}
                                        </div>
                                    )}
                                    <pre className="!bg-[#0d0d0d] !p-5 rounded-xl overflow-x-auto border border-white/10 font-mono text-xs leading-relaxed">
                                        <code className={className} {...props}>
                                            {children}
                                        </code>
                                    </pre>
                                </div>
                            </div>
                        );
                    },
                    a: ({ href, children }: { href?: string, children?: React.ReactNode }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 underline underline-offset-4 decoration-purple-500/30 hover:decoration-purple-500 transition-all font-medium"
                        >
                            {children}
                        </a>
                    ),
                    blockquote: ({ children }: { children?: React.ReactNode }) => (
                        <blockquote className="border-l-4 border-purple-500/40 bg-purple-500/5 px-6 py-4 italic text-zinc-400 my-6 rounded-r-xl">
                            {children}
                        </blockquote>
                    ),
                    strong: ({ children }: { children?: React.ReactNode }) => (
                        <strong className="font-bold text-zinc-100">
                            {children}
                        </strong>
                    ),
                    em: ({ children }: { children?: React.ReactNode }) => (
                        <em className="italic text-zinc-300">
                            {children}
                        </em>
                    ),
                    hr: () => (
                        <hr className="border-white/10 my-8 shadow-sm" />
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
