
export type ResearchPhase = 'initial' | 'brainstorming' | 'awaiting-selection' | 'evaluating' | 'deep-diving' | 'complete' | 'error';

export interface ResearchIdea {
    id: string;
    title: string;
    description: string;
    noveltyScore?: number;
    feasibilityScore?: number;
    impactScore?: number;
    totalScore?: number;
    reasoning?: string;
    status: 'pending' | 'accepted' | 'rejected';
}

export interface ResearchReport {
    title: string;
    summary: string;
    sections: {
        heading: string;
        content: string;
    }[];
    references?: string[];
}

export interface ResearchThought {
    id: string;
    timestamp: string;
    content: string;
}

export interface ResearchState {
    phase: ResearchPhase;
    topic: string;
    ideas: ResearchIdea[];
    selectedIdeaId?: string;
    report?: ResearchReport;
    logs: string[];
    debugLogs: ResearchDebugLog[];
    thoughts: ResearchThought[];
    tasks: ResearchTask[];
    papers: ResearchPaper[];
    resources: {
        gpus: { id: string; name: string; utilization: number; memory: string }[];
    };
}

export interface ResearchTask {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    priority: 'low' | 'medium' | 'high';
}

export interface ResearchPaper {
    id: string;
    title: string;
    authors: string[];
    year: number;
    citationCount: number;
    relevance: number; // 1-100
    summary: string;
    url: string;
}

export interface ResearchDebugLog {
    id: string;
    timestamp: string;
    type: 'call' | 'response';
    step: string;
    content: string; // The raw prompt or raw JSON response
}

export type ResearchUpdate =
    | { type: 'phase'; phase: ResearchPhase }
    | { type: 'log'; message: string }
    | { type: 'debug'; log: ResearchDebugLog }
    | { type: 'ideas'; ideas: ResearchIdea[] }
    | { type: 'evaluation'; ideaId: string; evaluation: Partial<ResearchIdea> }
    | { type: 'selection'; ideaId: string }
    | { type: 'report'; report: ResearchReport }
    | { type: 'tasks'; tasks: ResearchTask[] }
    | { type: 'papers'; papers: ResearchPaper[] }
    | { type: 'thought'; thought: ResearchThought }
    | { type: 'error'; message: string };
