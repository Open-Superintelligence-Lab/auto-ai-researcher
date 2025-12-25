import { ResearchPaper } from '@/types/research';

export class LiteratureService {
    private static SEMANTIC_SCHOLAR_URL = 'https://api.semanticscholar.org/graph/v1/paper/search';

    static async search(query: string, limit: number = 8): Promise<ResearchPaper[]> {
        if (process.env.NEXT_PUBLIC_MOCK_LITERATURE === 'true' || true) {
            console.log(`[LiteratureService] MOCK MODE: Returning fake papers for ${query}`);
            return [
                {
                    id: 'mock-1',
                    title: 'Efficient Training of Large Language Models with MoE',
                    authors: ['AI Researcher', 'Expert Dev'],
                    year: 2024,
                    citationCount: 150,
                    relevance: 95,
                    summary: 'This paper explores scaling laws for Mixture-of-Experts models...',
                    url: 'https://arxiv.org/abs/example1'
                },
                {
                    id: 'mock-2',
                    title: 'Optimizing Tokenization for Neural Machine Translation',
                    authors: ['Language Pro', 'Comp Sci'],
                    year: 2023,
                    citationCount: 45,
                    relevance: 80,
                    summary: 'A study on how different tokenization strategies impact translation quality...',
                    url: 'https://arxiv.org/abs/example2'
                }
            ];
        }
        try {
            console.log(`[LiteratureService] Searching for: ${query}`);
            const params = new URLSearchParams({
                query,
                limit: limit.toString(),
                fields: 'paperId,title,authors,year,citationCount,abstract,url,externalIds'
            });

            const response = await fetch(`${this.SEMANTIC_SCHOLAR_URL}?${params.toString()}`);
            if (!response.ok) {
                const error = await response.text();
                console.error('[LiteratureService] API Error:', error);
                return [];
            }

            const data = await response.json();
            const papers: any[] = data.data || [];

            return papers.map(p => ({
                id: p.paperId || `paper-${Math.random()}`,
                title: p.title || 'Untitled',
                authors: p.authors ? p.authors.map((a: any) => a.name) : ['Unknown'],
                year: p.year || new Date().getFullYear(),
                citationCount: p.citationCount || 0,
                relevance: 0, // Will be set by LLM later
                summary: p.abstract || 'No abstract available.',
                url: p.externalIds?.ArXiv ? `https://arxiv.org/abs/${p.externalIds.ArXiv}` : (p.url || '#')
            }));
        } catch (error) {
            console.error('[LiteratureService] Search failed:', error);
            return [];
        }
    }
}
