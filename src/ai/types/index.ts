export type AiInsightTask =
  | "daily-recommendations"
  | "score-explanation"
  | "relationship-history-summary"
  | "suggested-next-actions"
  | "contact-import-classification";

export interface AiTextRequest {
  task: AiInsightTask;
  prompt: string;
  context: Record<string, unknown>;
  fallbackText: string;
}

export interface AiTextResponse {
  text: string;
  provider: "deterministic-mock";
  deterministic: true;
}

export interface RealDealAiClient {
  generateText(request: AiTextRequest): Promise<AiTextResponse>;
}
