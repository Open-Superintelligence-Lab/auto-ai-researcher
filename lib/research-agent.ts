import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateObject } from 'ai';
import { z } from 'zod';
import { ResearchIdea, ResearchReport } from '@/types/research';

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || '',
});

// Using a cost-effective model for the research loop
const MODEL_ID = 'xiaomi/mimo-v2-flash:free';

export class ResearchAgent {
    private model = openrouter.chat(MODEL_ID);

    async brainstorm(topic: string): Promise<ResearchIdea[]> {
        console.log(`[ResearchAgent] Brainstorming on topic: ${topic}`);

        const { object } = await generateObject({
            model: this.model,
            schema: z.object({
                ideas: z.array(z.object({
                    title: z.string(),
                    description: z.string(),
                })),
            }),
            prompt: `You are an elite research scientist.
      Generate 5 distinct, novel, and innovative research hypotheses or topics related to: "${topic}".
      Focus on ideas that are theoretically grounded but explore new frontiers.
      Provide a clear title and a 2-3 sentence description for each.`,
        });

        return object.ideas.map((idea, index) => ({
            id: `idea-${Date.now()}-${index}`,
            ...idea,
        }));
    }

    async evaluate(ideas: ResearchIdea[]): Promise<ResearchIdea[]> {
        console.log(`[ResearchAgent] Evaluating ${ideas.length} ideas`);

        const { object } = await generateObject({
            model: this.model,
            schema: z.object({
                evaluations: z.array(z.object({
                    title: z.string(), // Mapping back by title to ensure order
                    noveltyScore: z.number().min(1).max(10),
                    feasibilityScore: z.number().min(1).max(10),
                    impactScore: z.number().min(1).max(10),
                    reasoning: z.string(),
                })),
            }),
            prompt: `Evaluate the following research ideas as a strict grant committee.
      Score each on Novelty, Feasibility, and Impact (1-10).
      Provide a concise reasoning for your scores.
      
      Ideas to evaluate:
      ${JSON.stringify(ideas.map(i => ({ title: i.title, description: i.description })), null, 2)}`,
        });

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

        const { object } = await generateObject({
            model: this.model,
            schema: z.object({
                title: z.string(),
                summary: z.string(),
                sections: z.array(z.object({
                    heading: z.string(),
                    content: z.string(),
                })),
                references: z.array(z.string()),
            }),
            prompt: `Write a comprehensive research proposal/report for the hypothesis: "${idea.title}".
      
      Context/Description: ${idea.description}
      Reasoning behind selection: ${idea.reasoning}
      
      Structure the report with:
      1. Abstract/Summary
      2. Introduction & Background
      3. Methodology / Theoretical Framework
      4. Expected Results & Implications
      5. Potential Challenges
      
      Make it substantial, academic in tone, but clear.`,
        });

        return object;
    }
}
