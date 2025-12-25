import { GoogleGenAI } from '@google/genai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import { z } from 'zod';
import { ResearchIdea, ResearchPaper } from '@/types/research';
import { LiteratureService } from './services/literature';

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || '',
});

const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
});

export type ProviderType = 'openrouter' | 'google';

export class ResearchAgent {
    private provider: ProviderType;
    private modelId: string;
    private aiModel: any;
    private onUpdate?: (update: any) => void;
    private onText?: (text: string) => void;

    constructor(
        provider: ProviderType = 'openrouter',
        modelId: string = 'nvidia/nemotron-3-nano-30b-a3b:free',
        options?: {
            onUpdate?: (update: any) => void,
            onText?: (text: string) => void,
        }
    ) {
        this.provider = provider;
        this.modelId = modelId;
        this.onUpdate = options?.onUpdate;
        this.onText = options?.onText;

        if (provider === 'google') {
            // Handled in the call
        } else {
            this.aiModel = openrouter.chat(modelId) as unknown as import('ai').LanguageModel;
        }
    }

    async chat(messages: any[]) {
        const systemPrompt = `You are a helpful AI research assistant. You can search for scientific papers and brainstorm research ideas when asked.
        
Be conversational and helpful. Use tools when appropriate to help the user.`;

        const result = await streamText({
            model: this.aiModel,
            system: systemPrompt,
            messages: messages,
            tools: {
                searchLiterature: {
                    description: 'Search for scientific papers on a topic.',
                    inputSchema: z.object({ topic: z.string() }),
                },
                brainstormIdeas: {
                    description: 'Generate research ideas/hypotheses.',
                    inputSchema: z.object({ topic: z.string(), context: z.string() }),
                }
            },
        });

        let fullText = '';
        for await (const textPart of result.textStream) {
            fullText += textPart;
            if (this.onText) this.onText(textPart);
        }

        const toolCalls = await result.toolCalls;
        if (toolCalls && toolCalls.length > 0) {
            if (this.onUpdate) {
                for (const tc of toolCalls) {
                    this.onUpdate({ type: 'tool-call', toolCall: tc });
                }
            }
            return { toolCalls };
        }

        return { completed: true };
    }

    async executeTool(toolName: string, args: any) {
        if (toolName === 'searchLiterature') {
            const papers = await this.searchLiterature(args.topic);
            if (this.onUpdate) this.onUpdate({ type: 'papers', papers });
            return papers.map(p => ({ title: p.title, summary: p.summary, year: p.year }));
        }
        if (toolName === 'brainstormIdeas') {
            const ideas = await this.brainstorm(args.topic);
            if (this.onUpdate) this.onUpdate({ type: 'ideas', ideas });
            return ideas.map(i => i.title);
        }
        throw new Error(`Unknown tool: ${toolName}`);
    }

    async brainstorm(topic: string): Promise<ResearchIdea[]> {
        const prompt = `You are an elite research scientist.
      Generate 5 distinct, novel, and innovative research hypotheses or topics related to: "${topic}".
      Focus on ideas that are theoretically grounded but explore new frontiers.
      Provide your response EXACTLY as a JSON object with this structure:
      {
        "ideas": [
          { "title": "...", "description": "..." },
          ...
        ]
      }`;

        const result = await streamText({
            model: this.aiModel,
            prompt,
        });

        let text = '';
        for await (const textPart of result.textStream) {
            text += textPart;
            if (this.onText) this.onText(textPart);
        }

        // Extract JSON
        let jsonStr = text.trim();
        if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
        } else if (jsonStr.includes('```')) {
            const parts = jsonStr.split('```');
            jsonStr = parts.find(p => p.trim().startsWith('{') || p.trim().startsWith('['))?.trim() || jsonStr;
        }

        const parsed = JSON.parse(jsonStr);
        const ideasArray = Array.isArray(parsed) ? parsed : parsed.ideas;

        return ideasArray.map((idea: any, index: number) => ({
            id: `idea-${Date.now()}-${index}`,
            ...idea,
            status: 'pending',
        }));
    }

    async searchLiterature(topic: string): Promise<ResearchPaper[]> {
        const papers = await LiteratureService.search(topic);
        if (papers.length === 0) return [];
        return this.rankPapers(topic, papers);
    }

    async rankPapers(topic: string, papers: ResearchPaper[]): Promise<ResearchPaper[]> {
        const prompt = `Rank these research papers by their direct relevance to the topic: "${topic}".
      Assign a Relevance Score (1-100) to each.
      
      Provide your response EXACTLY as a JSON object with this structure:
      {
        "rankings": [
          { "id": "...", "relevance": number },
          ...
        ]
      }

      Papers to rank:
      ${JSON.stringify(papers.map(p => ({ id: p.id, title: p.title, summary: p.summary.slice(0, 300) + '...' })), null, 2)}`;

        const result = await streamText({
            model: this.aiModel,
            prompt,
        });

        let text = '';
        for await (const textPart of result.textStream) {
            text += textPart;
            if (this.onText) this.onText(textPart);
        }

        // Extract JSON
        let jsonStr = text.trim();
        if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
        } else if (jsonStr.includes('```')) {
            const parts = jsonStr.split('```');
            jsonStr = parts.find(p => p.trim().startsWith('{') || p.trim().startsWith('['))?.trim() || jsonStr;
        }

        const object = JSON.parse(jsonStr);

        // Merge rankings back
        return papers.map(p => {
            const ranking = object.rankings.find((r: any) => r.id === p.id);
            return {
                ...p,
                relevance: ranking ? ranking.relevance : 0
            };
        }).sort((a, b) => b.relevance - a.relevance);
    }
}
