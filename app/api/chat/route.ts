import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, convertToCoreMessages } from 'ai';

export const maxDuration = 30;

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || '',
});

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = await streamText({
        model: openrouter.chat('nvidia/nemotron-3-nano-30b-a3b:free'),
        messages: convertToCoreMessages(messages),
    });

    return result.toUIMessageStreamResponse();
}
