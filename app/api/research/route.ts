import { ResearchAgent } from '@/lib/research-agent';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    console.log('[API] Research request received');
    const { topic, mode = 'start', selectedId, ideas: existingIdeas, provider = 'openrouter', model = 'openai/gpt-4o-mini' } = await req.json();
    console.log(`[API] Mode: ${mode}, Provider: ${provider}, Model: ${model}`);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            // Helper to send typed updates
            // Using protocol format: "2: <json>\n" for data parts
            const sendUpdate = (update: any) => {
                const json = JSON.stringify(update);
                controller.enqueue(encoder.encode(`2: ${json}\n`));
            };

            const agent = new ResearchAgent(provider, model, (debugLog) => {
                sendUpdate({ type: 'debug', log: debugLog });
            });

            try {
                if (mode === 'start') {
                    // --- Phase 1: Brainstorming ---
                    console.log('[API] Starting Brainstorming');
                    sendUpdate({ type: 'phase', phase: 'brainstorming' });
                    sendUpdate({ type: 'log', message: `Initializing literature indexing for: "${topic}"` });

                    // Simulate task queue
                    const tasks = [
                        { id: 't1', label: 'Paper Retrieval', status: 'running', priority: 'high' },
                        { id: 't2', label: 'Hypothesis Generation', status: 'pending', priority: 'medium' },
                        { id: 't3', label: 'Baseline Comparison', status: 'pending', priority: 'low' }
                    ] as const;
                    sendUpdate({ type: 'tasks', tasks });

                    // Simulating paper discovery
                    const papers = [
                        {
                            id: 'p1', title: 'Attention Is All You Need', authors: ['Vaswani et al.'], year: 2017,
                            citationCount: 120000, relevance: 98, summary: 'The seminal paper introducing the Transformer architecture which relies entirely on attention mechanisms.',
                            url: 'https://arxiv.org/abs/1706.03762'
                        },
                        {
                            id: 'p2', title: 'Deep Residual Learning for Image Recognition', authors: ['He et al.'], year: 2015,
                            citationCount: 180000, relevance: 85, summary: 'Introduced residual learning frameworks to ease the training of networks that are substantially deeper.',
                            url: 'https://arxiv.org/abs/1512.03385'
                        }
                    ];
                    sendUpdate({ type: 'papers', papers });

                    const ideas = await agent.brainstorm(topic);

                    // Mark paper retrieval as complete
                    sendUpdate({ type: 'tasks', tasks: tasks.map(t => t.id === 't1' ? { ...t, status: 'completed' } : { ...t, status: t.id === 't2' ? 'running' : 'pending' }) });

                    console.log(`[API] Brainstormed ${ideas.length} ideas`);
                    sendUpdate({ type: 'ideas', ideas });
                    sendUpdate({ type: 'log', message: `Ideas generated. Please select one to proceed.` });
                    sendUpdate({ type: 'phase', phase: 'awaiting-selection' });
                    return; // Pause here
                }

                if (mode === 'proceed') {
                    if (!selectedId || !existingIdeas) throw new Error('Missing selectedId or ideas');

                    const selectedIdea = existingIdeas.find((i: any) => i.id === selectedId);
                    if (!selectedIdea) throw new Error('Selected idea not found');

                    // --- Phase 2: Evaluation ---
                    console.log('[API] Starting Evaluation');
                    sendUpdate({ type: 'phase', phase: 'evaluating' });
                    sendUpdate({ type: 'log', message: 'Evaluating candidate for novelty, feasibility, and impact...' });

                    const evaluatedIdeas = await agent.evaluate([selectedIdea]); // Only evaluate the selected one
                    console.log('[API] Evaluation complete');
                    sendUpdate({ type: 'ideas', ideas: evaluatedIdeas });
                    sendUpdate({ type: 'log', message: 'Evaluation complete. Drafting report...' });

                    // --- Phase 4: Deep Dive ---
                    console.log('[API] Starting Deep Dive');
                    sendUpdate({ type: 'phase', phase: 'deep-diving' });

                    const reportFound = evaluatedIdeas[0];
                    const report = await agent.deepDive(reportFound);
                    console.log('[API] Deep Dive complete');
                    sendUpdate({ type: 'report', report });

                    sendUpdate({ type: 'phase', phase: 'complete' });
                    sendUpdate({ type: 'log', message: 'Research complete.' });
                }
            } catch (error: any) {
                console.error('[API ERROR]:', error);
                sendUpdate({ type: 'error', message: error.message || 'Unknown error occurred' });
                sendUpdate({ type: 'phase', phase: 'error' });
            } finally {
                console.log('[API] Stream closing');
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
