import { ResearchAgent } from '@/lib/research-agent';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    console.log('[API] Research request received');
    const { topic } = await req.json();
    console.log(`[API] Topic: ${topic}`);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            // Helper to send typed updates
            // Using protocol format: "2: <json>\n" for data parts
            const sendUpdate = (update: any) => {
                const json = JSON.stringify(update);
                controller.enqueue(encoder.encode(`2: ${json}\n`));
            };

            const agent = new ResearchAgent((debugLog) => {
                sendUpdate({ type: 'debug', log: debugLog });
            });

            try {
                // --- Phase 1: Brainstorming ---
                console.log('[API] Starting Brainstorming');
                sendUpdate({ type: 'phase', phase: 'brainstorming' });
                sendUpdate({ type: 'log', message: `Starting brainstorming for topic: "${topic}"` });

                const ideas = await agent.brainstorm(topic);
                console.log(`[API] Brainstormed ${ideas.length} ideas`);
                sendUpdate({ type: 'ideas', ideas });
                sendUpdate({ type: 'log', message: `Generated ${ideas.length} potential hypotheses.` });

                // --- Phase 2: Evaluation ---
                console.log('[API] Starting Evaluation');
                sendUpdate({ type: 'phase', phase: 'evaluating' });
                sendUpdate({ type: 'log', message: 'Evaluating ideas for novelty, feasibility, and impact...' });

                const evaluatedIdeas = await agent.evaluate(ideas);
                console.log('[API] Evaluation complete');
                sendUpdate({ type: 'ideas', ideas: evaluatedIdeas });
                sendUpdate({ type: 'log', message: 'Evaluation complete. Selecting the best candidate...' });

                // --- Phase 3: Selection ---
                console.log('[API] Selecting best idea');
                const bestIdea = evaluatedIdeas.reduce((prev, current) =>
                    (prev.totalScore || 0) > (current.totalScore || 0) ? prev : current
                );

                sendUpdate({ type: 'selection', ideaId: bestIdea.id });
                sendUpdate({ type: 'log', message: `Selected "${bestIdea.title}" (Score: ${bestIdea.totalScore})` });

                // --- Phase 4: Deep Dive ---
                console.log('[API] Starting Deep Dive');
                sendUpdate({ type: 'phase', phase: 'deep-diving' });
                sendUpdate({ type: 'log', message: 'Drafting comprehensive research report...' });

                const report = await agent.deepDive(bestIdea);
                console.log('[API] Deep Dive complete');
                sendUpdate({ type: 'report', report });

                sendUpdate({ type: 'phase', phase: 'complete' });
                sendUpdate({ type: 'log', message: 'Research complete.' });

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
