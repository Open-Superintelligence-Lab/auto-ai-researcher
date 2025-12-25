import { ResearchPaper } from '@/types/research';

export class LiteratureService {
    private static SEMANTIC_SCHOLAR_URL = 'https://api.semanticscholar.org/graph/v1/paper/search';

    static async search(query: string, limit: number = 8): Promise<ResearchPaper[]> {
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
