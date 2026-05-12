import type { AiTextRequest, AiTextResponse, RealDealAiClient } from "@/ai/types";

export class DeterministicAiClient implements RealDealAiClient {
  async generateText(request: AiTextRequest): Promise<AiTextResponse> {
    return {
      text: request.fallbackText,
      provider: "deterministic-mock",
      deterministic: true,
    };
  }
}
