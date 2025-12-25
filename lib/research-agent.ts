import { GoogleGenAI } from '@google/genai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, streamText } from 'ai';
import { z } from 'zod';
import { ResearchIdea, ResearchReport, ResearchPaper, ResearchThought } from '@/types/research';
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
    private aiModel: any; // Can be LanguageModel or GenAI model
    private onDebug?: (log: import('@/types/research').ResearchDebugLog) => void;
    private debugCounter = 0;
    private onThought?: (thought: import('@/types/research').ResearchThought) => void;
    private onUpdate?: (update: any) => void;
    private onText?: (text: string) => void;
    private onMessage?: (message: import('@/types/research').ChatMessage) => void;

    constructor(
        provider: ProviderType = 'openrouter',
        modelId: string = 'nvidia/nemotron-3-nano-30b-a3b:free',
        options?: {
            onDebug?: (log: import('@/types/research').ResearchDebugLog) => void,
            onThought?: (thought: import('@/types/research').ResearchThought) => void,
            onUpdate?: (update: any) => void,
            onText?: (text: string) => void,
            onMessage?: (message: import('@/types/research').ChatMessage) => void
        }
    ) {
        this.provider = provider;
        this.modelId = modelId;
        this.onDebug = options?.onDebug;
        this.onThought = options?.onThought;
        this.onUpdate = options?.onUpdate;
        this.onText = options?.onText;
        this.onMessage = options?.onMessage;

        if (provider === 'google') {
            // No direct initialization here anymore, handled in call
        } else {
            this.aiModel = openrouter.chat(modelId) as unknown as import('ai').LanguageModel;
        }
    }

    private logThought(content: string) {
        if (this.onThought) {
            this.onThought({
                id: `thought-${Date.now()}`,
                timestamp: new Date().toISOString(),
                content
            });
        }
    }

    async runAutonomous(topic: string, history: any[] = [], isResearchMode: boolean = true) {
        // Only log thought in research mode
        if (isResearchMode) {
            this.logThought(`Initializing agentic research loop stage for: "${topic}"`);
        }

        const combinedMessages = history;

        const systemPrompt = isResearchMode
            ? `You are an autonomous research agent. Your goal is to research whatever the user tells you to research.
            Follow these steps:
            1. Search literature to understand the field.
            2. Brainstorm several novel ideas based on the literature.
            You must call tools to perform these actions.
            Always explain your reasoning before calling a tool.`
            : `You are a helpful, friendly AI research assistant.
            
            Be conversational, informative, and engaging. Have a natural discussion with the user about their topic.
            
            IMPORTANT: Do NOT use any tools or start the research pipeline unless the user explicitly asks you to. 
            Just chat naturally and answer their questions. When they're ready to begin autonomous research, 
            they will tell you, and then you can use tools.`;

        const result = await streamText({
            model: this.aiModel,
            system: systemPrompt,
            messages: combinedMessages,
            tools: isResearchMode ? {
                searchLiterature: {
                    description: 'Search for scientific papers on a topic.',
                    inputSchema: z.object({ topic: z.string() }),
                },
                brainstormIdeas: {
                    description: 'Generate research ideas/hypotheses.',
                    inputSchema: z.object({ topic: z.string(), context: z.string() }),
                }
            } : {},
        });

        let fullText = '';
        for await (const textPart of result.textStream) {
            fullText += textPart;
            if (this.onText) this.onText(textPart);
        }

        if (fullText && this.onUpdate) {
            this.onUpdate({
                type: 'thought',
                thought: { id: `t-${Date.now()}`, content: fullText, timestamp: new Date() }
            });
        }

        const toolCalls = await result.toolCalls;
        if (toolCalls && toolCalls.length > 0) {
            this.logThought(`[SYSTEM] Agent suggested tool calls: ${toolCalls.map(t => t.toolName).join(', ')}`);
            if (this.onUpdate) {
                for (const tc of toolCalls) {
                    this.onUpdate({ type: 'tool-call', toolCall: tc });
                }
            }
            return { phase: 'awaiting-tool-approval', toolCalls };
        }

        this.logThought("I have completed the initial discovery and ideation phase. Please review the hypotheses below.");
        return { phase: 'awaiting-selection' };
    }

    async runDeepDive(selectedIdea: ResearchIdea) {
        this.logThought(`Proceeding with: "${selectedIdea.title}".`);

        // Step 3: Evaluation
        this.logThought("[ACTION] Running feasibility and impact evaluation...");
        const evaluated = await this.evaluate([selectedIdea]);
        if (this.onUpdate) this.onUpdate({ type: 'ideas', ideas: evaluated });
        this.logThought("[RESULT] Evaluation complete. Feasibility and impact scores updated.");

        // Step 4: Report
        this.logThought("[ACTION] Writing the final research report...");
        const report = await this.deepDive(evaluated[0]);
        if (this.onUpdate) this.onUpdate({ type: 'report', report });
        this.logThought("[RESULT] Report finalized.");

        this.logThought("Research complete. The final report is ready in the Archives.");
        return { phase: 'complete' };
    }

    async executeTool(toolName: string, args: any) {
        if (toolName === 'searchLiterature') {
            this.logThought(`[ACTION] Searching literature for: ${args.topic}`);
            const papers = await this.searchLiterature(args.topic);
            if (this.onUpdate) this.onUpdate({ type: 'papers', papers });
            this.logThought(`[RESULT] Found ${papers.length} relevant papers.`);
            return papers.map(p => ({ title: p.title, summary: p.summary, year: p.year }));
        }
        if (toolName === 'brainstormIdeas') {
            this.logThought(`[ACTION] Brainstorming new hypotheses for: ${args.topic}`);
            const ideas = await this.brainstorm(args.topic);
            if (this.onUpdate) this.onUpdate({ type: 'ideas', ideas });
            this.logThought(`[RESULT] Generated ${ideas.length} novel research directions.`);
            return ideas.map(i => i.title);
        }
        throw new Error(`Unknown tool: ${toolName}`);
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
                    // (Google implementation stays mostly same for now as it's not the primary focus of streaming requested)
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
                    const result = await streamText({
                        model: this.aiModel,
                        prompt: combinedPrompt,
                    });

                    for await (const textPart of result.textStream) {
                        text += textPart;
                        if (this.onText) this.onText(textPart);
                    }
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

    async searchLiterature(topic: string): Promise<ResearchPaper[]> {
        const papers = await LiteratureService.search(topic);
        if (papers.length === 0) return [];

        return this.rankPapers(topic, papers);
    }

    async rankPapers(topic: string, papers: ResearchPaper[]): Promise<ResearchPaper[]> {
        console.log(`[ResearchAgent] Ranking ${papers.length} papers for topic: ${topic}`);

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

        const schema = z.object({
            rankings: z.array(z.object({
                id: z.string(),
                relevance: z.number().min(0).max(100),
            })),
        });

        const object = await this.callLLM(prompt, schema, 'rankPapers');

        // Merge rankings back
        return papers.map(p => {
            const ranking = object.rankings.find(r => r.id === p.id);
            return {
                ...p,
                relevance: ranking ? ranking.relevance : 0
            };
        }).sort((a, b) => b.relevance - a.relevance);
    }
}
