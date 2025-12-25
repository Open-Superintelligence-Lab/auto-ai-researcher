import { GoogleGenAI } from '@google/genai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { z } from 'zod';
import { ResearchIdea, ResearchReport } from '@/types/research';

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || '',
});

const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
});

export type ProviderType = 'openrouter' | 'google';

// Using a cost-effective model for the research loop
// Using a reliable free model for the research loop
export class ResearchAgent {
    private provider: ProviderType;
    private modelId: string;
    private aiModel: any; // Can be LanguageModel or GenAI model
    private onDebug?: (log: import('@/types/research').ResearchDebugLog) => void;
    private debugCounter = 0;

    constructor(
        provider: ProviderType = 'openrouter',
        modelId: string = 'nvidia/nemotron-3-nano-30b-a3b:free',
        onDebug?: (log: import('@/types/research').ResearchDebugLog) => void
    ) {
        this.provider = provider;
        this.modelId = modelId;
        this.onDebug = onDebug;

        if (provider === 'google') {
            // No direct initialization here anymore, handled in call
        } else {
            this.aiModel = openrouter.chat(modelId) as unknown as import('ai').LanguageModel;
        }
    }

    private async callLLM<T>(prompt: string, schema: z.ZodType<T>, step: string, retries: number = 2): Promise<T> {
        let lastError: any;
        const systemPrompt = "You are a professional research AI. You MUST respond ONLY with a valid JSON object. Do not include any preamble, commentary, or explanation. Your entire response must be parseable as JSON.";
        const combinedPrompt = `${systemPrompt}\n\nTask: ${prompt}\n\nCRITICAL: Output MUST be a valid JSON object matching the requested schema. Wrap in \` \` \`json code blocks if you must, but ensure the content is pure JSON.`;

        for (let i = 0; i <= retries; i++) {
            try {
                this.logDebug('call', `${step} (Attempt ${i + 1})`, combinedPrompt);
                let text = '';

                if (this.provider === 'google') {
                    const isV3 = this.modelId.includes('gemini-3');
                    const config: any = {
                        thinkingConfig: isV3 ? { thinkingLevel: 'HIGH' } : undefined,
                        responseMimeType: 'application/json',
                    };

                    const result = await genAI.models.generateContent({
                        model: this.modelId,
                        config,
                        contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }],
                    });

                    text = result.text || '';
                } else {
                    const result = await generateText({
                        model: this.aiModel,
                        prompt: combinedPrompt,
                    });
                    text = result.text || '';
                }

                // --- ROBUST JSON EXTRACTION ---
                let jsonStr = text.trim();

                // 1. Try to find JSON in markdown blocks
                if (jsonStr.includes('```json')) {
                    jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
                } else if (jsonStr.includes('```')) {
                    const parts = jsonStr.split('```');
                    // Find the part that looks most like JSON (starts with { or [)
                    jsonStr = parts.find(p => p.trim().startsWith('{') || p.trim().startsWith('['))?.trim() || jsonStr;
                }

                this.logDebug('response', step, jsonStr);

                try {
                    let parsed = JSON.parse(jsonStr);

                    // FALLBACK: If the model returns an array instead of the requested object wrapper
                    if (Array.isArray(parsed)) {
                        if (step === 'brainstorm') {
                            parsed = { ideas: parsed };
                        } else if (step === 'evaluate') {
                            parsed = { evaluations: parsed };
                        }
                    }

                    return schema.parse(parsed);
                } catch (e) {
                    console.error(`[Attempt ${i + 1}] Schema validation failed:`, jsonStr, e);
                    lastError = e;
                }
            } catch (e) {
                console.error(`[Attempt ${i + 1}] LLM Call failed:`, e);
                lastError = e;
            }

            if (i < retries) {
                console.log(`[ResearchAgent] Retrying ${step}... (${i + 1}/${retries})`);
                await new Promise(r => setTimeout(r, 1500 * (i + 1)));
            }
        }

        throw new Error(`Research Agent failed after ${retries + 1} attempts. Error: ${lastError?.message || 'Schema mismatch or parsing error'}`);
    }

    private logDebug(type: 'call' | 'response', step: string, content: string) {
        console.log(`[Agent Debug] ${type.toUpperCase()} - ${step}`);
        if (this.onDebug) {
            this.onDebug({
                id: `debug-${Date.now()}-${this.debugCounter++}`,
                timestamp: new Date().toISOString(),
                type,
                step,
                content
            });
        }
    }

    async brainstorm(topic: string): Promise<ResearchIdea[]> {
        console.log(`[ResearchAgent] Brainstorming on topic: ${topic}`);

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

        this.logDebug('call', 'brainstorm', prompt);

        const schema = z.object({
            ideas: z.array(z.object({
                title: z.string(),
                description: z.string(),
            })),
        });

        const object = await this.callLLM(prompt, schema, 'brainstorm');

        this.logDebug('response', 'brainstorm', JSON.stringify(object, null, 2));

        return object.ideas.map((idea, index) => ({
            id: `idea-${Date.now()}-${index}`,
            ...idea,
            status: 'pending',
        }));
    }

    async evaluate(ideas: ResearchIdea[]): Promise<ResearchIdea[]> {
        console.log(`[ResearchAgent] Evaluating ${ideas.length} ideas`);

        const prompt = `Evaluate the following research ideas as a strict grant committee.
      Score each on Novelty, Feasibility, and Impact (1-10).
      Provide a concise reasoning for your scores.
      
      Provide your response EXACTLY as a JSON object with this structure:
      {
        "evaluations": [
          {
            "title": "...", 
            "noveltyScore": number, 
            "feasibilityScore": number, 
            "impactScore": number, 
            "reasoning": "..."
          },
          ...
        ]
      }

      Ideas to evaluate:
      ${JSON.stringify(ideas.map(i => ({ title: i.title, description: i.description })), null, 2)}`;

        this.logDebug('call', 'evaluate', prompt);

        const schema = z.object({
            evaluations: z.array(z.object({
                title: z.string(), // Mapping back by title to ensure order
                noveltyScore: z.number().min(1).max(10),
                feasibilityScore: z.number().min(1).max(10),
                impactScore: z.number().min(1).max(10),
                reasoning: z.string(),
            })),
        });

        const object = await this.callLLM(prompt, schema, 'evaluate');

        this.logDebug('response', 'evaluate', JSON.stringify(object, null, 2));

        // Merge evaluations back into ideas
        return ideas.map(originalParams => {
            const evalResult = object.evaluations.find(e => e.title === originalParams.title);
            if (!evalResult) return originalParams;

            const totalScore = (evalResult.noveltyScore + evalResult.feasibilityScore + evalResult.impactScore) / 3;

            return {
                ...originalParams,
                noveltyScore: evalResult.noveltyScore,
                feasibilityScore: evalResult.feasibilityScore,
                impactScore: evalResult.impactScore,
                reasoning: evalResult.reasoning,
                totalScore: Number(totalScore.toFixed(1)),
            };
        });
    }

    async deepDive(idea: ResearchIdea): Promise<ResearchReport> {
        console.log(`[ResearchAgent] Deep diving into: ${idea.title}`);

        const prompt = `Write a comprehensive research proposal/report for the hypothesis: "${idea.title}".
      
      Context/Description: ${idea.description}
      Reasoning behind selection: ${idea.reasoning}
      
      Provide your response EXACTLY as a JSON object with this structure:
      {
        "title": "...",
        "summary": "...",
        "sections": [
          { "heading": "...", "content": "..." },
          ...
        ],
        "references": ["...", "..."]
      }

      Make it substantial, academic in tone, but clear.`;

        this.logDebug('call', 'deepDive', prompt);

        const schema = z.object({
            title: z.string(),
            summary: z.string(),
            sections: z.array(z.object({
                heading: z.string(),
                content: z.string(),
            })),
            references: z.array(z.string()),
        });

        const object = await this.callLLM(prompt, schema, 'deepDive');

        this.logDebug('response', 'deepDive', JSON.stringify(object, null, 2));

        return object;
    }
}
