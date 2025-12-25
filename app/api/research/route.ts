import { createDataStreamResponse } from 'ai';
import { ResearchAgent } from '@/lib/research-agent';

export const maxDuration = 60; // Allow 60 seconds for the full process

export async function POST(req: Request) {
    const { topic } = await req.json();

    return createDataStreamResponse({
        execute: async (dataStream) => {
            const agent = new ResearchAgent();

            // Helper to send typed updates
            const sendUpdate = (update: any) => {
                dataStream.writeData(update);
            };

            try {
                // --- Phase 1: Brainstorming ---
                sendUpdate({ type: 'phase', phase: 'brainstorming' });
                sendUpdate({ type: 'log', message: `Starting brainstorming for topic: "${topic}"` });

                const ideas = await agent.brainstorm(topic);
                sendUpdate({ type: 'ideas', ideas });
                sendUpdate({ type: 'log', message: `Generated ${ideas.length} potential hypotheses.` });

                // --- Phase 2: Evaluation ---
                sendUpdate({ type: 'phase', phase: 'evaluating' });
                sendUpdate({ type: 'log', message: 'Evaluating ideas for novelty, feasibility, and impact...' });

                const evaluatedIdeas = await agent.evaluate(ideas);
                // Send updates one by one to simulate "thinking" or just batch them
                // For now, we update the full list with scores
                sendUpdate({ type: 'ideas', ideas: evaluatedIdeas });
                sendUpdate({ type: 'log', message: 'Evaluation complete. Selecting the best candidate...' });

                // --- Phase 3: Selection ---
                // Find best idea
                const bestIdea = evaluatedIdeas.reduce((prev, current) =>
                    (prev.totalScore || 0) > (current.totalScore || 0) ? prev : current
                );

                sendUpdate({ type: 'selection', ideaId: bestIdea.id });
                sendUpdate({ type: 'log', message: `Selected "${bestIdea.title}" (Score: ${bestIdea.totalScore})` });

                // --- Phase 4: Deep Dive ---
                sendUpdate({ type: 'phase', phase: 'deep-diving' });
                sendUpdate({ type: 'log', message: 'Drafting comprehensive research report...' });

                const report = await agent.deepDive(bestIdea);
                sendUpdate({ type: 'report', report });

                sendUpdate({ type: 'phase', phase: 'complete' });
                sendUpdate({ type: 'log', message: 'Research complete.' });

            } catch (error) {
                console.error('Research error:', error);
                sendUpdate({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error occurred' });
                sendUpdate({ type: 'phase', phase: 'error' });
            }
        },
    });
}
