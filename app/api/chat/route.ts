import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

export const maxDuration = 30;

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || '',
});

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = await streamText({
        model: openrouter.chat('xiaomi/mimo-v2-flash:free'),
        messages,
    });

    return result.toUIMessageStreamResponse();
}
