export const promptTemplates = {
  dailyRecommendations: {
    name: "Daily recommendations",
    template:
      "Select the three to five people the founder should contact today. Prioritize overdue commitments, active campaigns, high-value relationships, declining momentum, recent opportunities, and follow-up promises. Every recommendation must include a plain-English reason and a concrete suggested action.",
  },
  scoreExplanation: {
    name: "Social Equity Score explanation",
    template:
      "Explain the Social Equity Score in direct, founder-friendly English. Use the score factors without exposing formula weights. Mention the strongest positive factor and the clearest relationship risk.",
  },
  relationshipHistorySummary: {
    name: "Relationship history summary",
    template:
      "Summarize the relationship history from the interaction timeline. Keep the summary factual, specific, and useful for deciding the next touch.",
  },
  suggestedNextActions: {
    name: "Suggested next actions",
    template:
      "Recommend the next relationship action. The action must be specific, respectful, and tied to current context, campaign relevance, or a previous commitment.",
  },
  contactImportClassification: {
    name: "Contact import classification",
    template:
      "Classify imported founder relationship records into pods, detect campaign relevance, flag missing identity fields, identify duplicates, and explain the initial relationship score in plain English. Prefer deterministic, auditable rules when no AI provider is connected.",
  },
} as const;
