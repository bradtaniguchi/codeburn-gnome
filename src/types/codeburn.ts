export interface CodeburnCurrentMetrics {
    cost: number;
    calls?: number;
    sessions?: number;
    cacheHitPercent?: number;
    inputTokens?: number;
    outputTokens?: number;
    label?: string;
}

export interface CodeburnStatusResponse {
    currency?: string;
    current?: CodeburnCurrentMetrics;
}
