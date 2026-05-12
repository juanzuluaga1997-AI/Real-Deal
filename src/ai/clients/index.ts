import { DeterministicAiClient } from "./deterministic-ai-client";

let client: DeterministicAiClient | null = null;

export function getAiClient(): DeterministicAiClient {
  if (!client) {
    client = new DeterministicAiClient();
  }

  return client;
}
