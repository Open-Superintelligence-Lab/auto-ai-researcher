import { ResearchAgent } from '@/lib/research-agent';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    console.log('[API] Research request received');
    const {
        topic,
        mode = 'start',
        selectedId,
        ideas: existingIdeas,
        provider = 'openrouter',
        model = 'openai/gpt-4o-mini',
        executionMode = 'fast',
        history = [],
        toolCall = null
    } = await req.json();
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

            const agent = new ResearchAgent(provider, model, {
                onDebug: (debugLog) => sendUpdate({ type: 'debug', log: debugLog }),
                onThought: (thought) => sendUpdate({ type: 'thought', thought }),
                onUpdate: (update) => sendUpdate(update),
                onText: (text) => {
                    controller.enqueue(encoder.encode(`0: ${JSON.stringify(text)}\n`));
                },
                onMessage: (message) => sendUpdate({ type: 'message', message })
            });

            try {
                if (mode === 'start') {
                    const result = await agent.runAutonomous(topic, executionMode as 'plan' | 'fast', history);
                    sendUpdate({ type: 'phase', phase: result.phase });
                }

                if (mode === 'approve-plan') {
                    const result = await agent.runAutonomous(topic, 'fast', history);
                    sendUpdate({ type: 'phase', phase: result.phase });
                }

                if (mode === 'call-tool') {
                    if (!toolCall) throw new Error('Missing toolCall for call-tool mode');
                    const result = await agent.executeTool(toolCall.toolName, toolCall.args);
                    sendUpdate({ type: 'tool-result', result, toolCallId: toolCall.toolCallId });
                }

                if (mode === 'proceed') {
                    if (!selectedId || !existingIdeas) throw new Error('Missing selectedId or ideas');
                    const selectedIdea = existingIdeas.find((i: any) => i.id === selectedId);
                    if (!selectedIdea) throw new Error('Selected idea not found');

                    const result = await agent.runDeepDive(selectedIdea);
                    sendUpdate({ type: 'phase', phase: result.phase });
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
