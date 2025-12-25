
export type ResearchPhase = 'initial' | 'brainstorming' | 'evaluating' | 'deep-diving' | 'complete' | 'error';

export interface ResearchIdea {
    id: string;
    title: string;
    description: string;
    noveltyScore?: number;
    feasibilityScore?: number;
    impactScore?: number;
    totalScore?: number;
    reasoning?: string;
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

export interface ResearchState {
    phase: ResearchPhase;
    topic: string;
    ideas: ResearchIdea[];
    selectedIdeaId?: string;
    report?: ResearchReport;
    logs: string[];
    debugLogs: ResearchDebugLog[];
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
    | { type: 'error'; message: string };
