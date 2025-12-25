import { ResearchAgent } from '@/lib/research-agent';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const {
        messages = [],
        provider = 'openrouter',
        model = 'nvidia/nemotron-3-nano-30b-a3b:free',
        toolCall = null,
    } = await req.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const sendUpdate = (update: any) => {
                const json = JSON.stringify(update);
                controller.enqueue(encoder.encode(`2: ${json}\n`));
            };

            const agent = new ResearchAgent(provider, model, {
                onUpdate: (update) => sendUpdate(update),
                onText: (text) => {
                    controller.enqueue(encoder.encode(`0: ${JSON.stringify(text)}\n`));
                },
            });

            try {
                if (toolCall) {
                    // Execute tool
                    const result = await agent.executeTool(toolCall.toolName, toolCall.args);
                    sendUpdate({ type: 'tool-result', result, toolCallId: toolCall.toolCallId });
                } else {
                    // Regular chat
                    await agent.chat(messages);
                }
            } catch (error: any) {
                console.error('[API ERROR]:', error);
                sendUpdate({ type: 'error', message: error.message || 'Unknown error occurred' });
            } finally {
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
