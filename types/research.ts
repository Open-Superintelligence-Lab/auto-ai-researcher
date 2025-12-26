
export interface ResearchIdea {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'accepted' | 'rejected';
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'tool' | 'system';
    content: string;
    toolCalls?: any[];
    toolCallId?: string;
}

export interface ResearchState {
    messages: ChatMessage[];
    papers: ResearchPaper[];
    ideas: ResearchIdea[];
    pendingToolCalls: any[];
    transcript: string;
}

export interface ResearchPaper {
    id: string;
    title: string;
    authors: string[];
    year: number;
    citationCount: number;
    relevance: number;
    summary: string;
    url: string;
}

export type ResearchUpdate =
    | { type: 'ideas'; ideas: ResearchIdea[] }
    | { type: 'papers'; papers: ResearchPaper[] }
    | { type: 'tool-call'; toolCall: any }
    | { type: 'tool-result'; result: any, toolCallId: string }
    | { type: 'error'; message: string };
