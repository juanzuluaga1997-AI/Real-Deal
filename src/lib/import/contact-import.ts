import { createHash } from "node:crypto";

import type { ImportedContactRecord, ImportSummary } from "@/lib/import/types";
import type { RelationshipRing } from "@/lib/data/types";

export type ContactImportRowValue = string | number | boolean | Date | null | undefined;
export type ContactImportRow = Record<string, ContactImportRowValue>;

interface DraftContact extends ImportedContactRecord {
  identityKeys: string[];
}

interface ContactImportProcessingResult {
  contacts: ImportedContactRecord[];
  summary: ImportSummary;
  warnings: string[];
}

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/;

const podDefinitions = [
  {
    podId: "capital-circle",
    podName: "Capital Circle",
    category: "Investor",
    keywords: ["investor", "vc", "venture", "capital", "fund", "board", "angel", "partner meeting", "series a"],
  },
  {
    podId: "hiring-network",
    podName: "Hiring Network",
    category: "Candidate",
    keywords: ["candidate", "recruiter", "recruiting", "talent", "search", "hire", "hiring", "engineering search"],
  },
  {
    podId: "operator-bench",
    podName: "Operator Bench",
    category: "Operator",
    keywords: ["operator", "operations", "advisor", "executive", "vp", "chief", "head of", "leader"],
  },
  {
    podId: "customer-signal",
    podName: "Customer Signal",
    category: "Customer",
    keywords: ["customer", "client", "buyer", "design partner", "cio", "revenue", "enterprise", "pilot"],
  },
  {
    podId: "strategic-partners",
    podName: "Strategic Partners",
    category: "Partner",
    keywords: ["partner", "partnership", "alliances", "channel", "distribution", "co-sell", "marketplace"],
  },
  {
    podId: "market-makers",
    podName: "Market Makers",
    category: "Founder",
    keywords: ["founder", "ceo", "market", "intro", "introduction", "influence", "community", "event"],
  },
] as const;

const campaignKeywordMap = [
  { id: "series-a-readiness", name: "Series A Readiness", keywords: ["series a", "fundraising", "investor", "round", "capital"] },
  { id: "vp-engineering-search", name: "VP Engineering Search", keywords: ["engineering search", "vp engineering", "candidate", "recruiter", "hiring"] },
  { id: "cloud-partner-motion", name: "Cloud Partner Motion", keywords: ["cloud", "partner", "marketplace", "co-sell", "channel"] },
  { id: "enterprise-design-partners", name: "Enterprise Design Partners", keywords: ["enterprise", "customer", "design partner", "pilot", "buyer"] },
  { id: "founder-dinner-june", name: "June Founder Dinner", keywords: ["event", "dinner", "founder dinner", "follow-up"] },
] as const;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeIdentity(value: string): string {
  return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function makeRecordId(sourceName: string, rowNumber: number, seed: string): string {
  return createHash("sha1").update(`${sourceName}:${rowNumber}:${seed}`).digest("hex").slice(0, 12);
}

function getValueByHeader(row: ContactImportRow, candidates: string[]): string | undefined {
  const normalizedCandidates = new Set(candidates.map(normalizeHeader));
  const matchingKey = Object.keys(row).find((key) => normalizedCandidates.has(normalizeHeader(key)));
  const value = matchingKey ? row[matchingKey] : undefined;

  if (value === null || value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return normalizeWhitespace(String(value));
}

function getFirstPopulatedValue(row: ContactImportRow): string | undefined {
  const value = Object.values(row).find((candidate) => candidate !== null && candidate !== undefined && String(candidate).trim());
  return value === undefined ? undefined : normalizeWhitespace(String(value));
}

function normalizeEmail(value?: string): string | undefined {
  const email = value?.match(emailPattern)?.[0].toLowerCase();
  return email || undefined;
}

function normalizePhone(value?: string): string | undefined {
  return value?.match(phonePattern)?.[0];
}

function normalizeDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const excelSerial = Number(trimmed);

  if (Number.isFinite(excelSerial) && excelSerial > 20000 && excelSerial < 80000) {
    const date = new Date(Date.UTC(1899, 11, 30 + Math.floor(excelSerial)));
    return date.toISOString().slice(0, 10);
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString().slice(0, 10);
}

function splitList(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/[,;|]/)
    .map(normalizeWhitespace)
    .filter(Boolean);
}

function normalizeImportance(value?: string): number {
  if (!value) {
    return 5;
  }

  const lower = value.toLowerCase();
  const numeric = Number(value);

  if (Number.isFinite(numeric)) {
    if (numeric > 10) {
      return Math.max(1, Math.min(10, Math.round(numeric / 10)));
    }

    return Math.max(1, Math.min(10, Math.round(numeric)));
  }

  if (lower.includes("critical") || lower.includes("highest")) {
    return 10;
  }

  if (lower.includes("high") || lower.includes("important")) {
    return 8;
  }

  if (lower.includes("medium")) {
    return 6;
  }

  if (lower.includes("low")) {
    return 3;
  }

  return 5;
}

function normalizeResponsiveness(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const lower = value.toLowerCase();
  const numeric = Number(value.replace("%", ""));

  if (Number.isFinite(numeric)) {
    if (value.includes("%") || numeric > 10) {
      return Math.max(0, Math.min(1, numeric / 100));
    }

    if (numeric > 1) {
      return Math.max(0, Math.min(1, numeric / 10));
    }

    return Math.max(0, Math.min(1, numeric));
  }

  if (lower.includes("fast") || lower.includes("strong") || lower.includes("high")) {
    return 0.88;
  }

  if (lower.includes("slow") || lower.includes("low")) {
    return 0.42;
  }

  return undefined;
}

function detectCampaigns(searchText: string, explicitCampaigns: string[]): Array<{ id: string; name: string }> {
  const explicitMatches = explicitCampaigns.map((name) => {
    const configured = campaignKeywordMap.find((campaign) => campaign.name.toLowerCase() === name.toLowerCase());
    return configured ? { id: configured.id, name: configured.name } : { id: normalizeIdentity(name) || "custom-campaign", name };
  });
  const inferredMatches = campaignKeywordMap
    .filter((campaign) => campaign.keywords.some((keyword) => searchText.includes(keyword)))
    .map((campaign) => ({ id: campaign.id, name: campaign.name }));
  const merged = [...explicitMatches, ...inferredMatches];
  const seen = new Set<string>();

  return merged.filter((campaign) => {
    if (seen.has(campaign.id)) {
      return false;
    }

    seen.add(campaign.id);
    return true;
  });
}

function classifyPod(searchText: string, relationshipType?: string): { podId: string; podName: string; category: string } {
  const explicitText = relationshipType?.toLowerCase() ?? "";
  const matchedPod =
    podDefinitions.find((pod) => pod.keywords.some((keyword) => explicitText.includes(keyword))) ??
    podDefinitions.find((pod) => pod.keywords.some((keyword) => searchText.includes(keyword)));

  return matchedPod ?? podDefinitions[podDefinitions.length - 1];
}

function calculateDecayRisk(lastInteractionDate: string | undefined, followUpCommitment: string | undefined, importanceLevel: number): number {
  if (!lastInteractionDate) {
    return importanceLevel >= 8 ? 64 : 42;
  }

  const now = new Date("2026-05-11T00:00:00.000Z");
  const lastInteraction = new Date(`${lastInteractionDate}T00:00:00.000Z`);
  const daysSinceLastInteraction = Math.max(0, Math.round((now.getTime() - lastInteraction.getTime()) / 86_400_000));
  const cadenceDays = importanceLevel >= 8 ? 21 : importanceLevel >= 6 ? 30 : 45;
  const overdueDays = Math.max(0, daysSinceLastInteraction - cadenceDays);
  const followUpPressure = followUpCommitment ? 18 : 0;

  return Math.max(0, Math.min(100, Math.round((overdueDays / cadenceDays) * 68 + followUpPressure)));
}

function calculateInitialScore(input: {
  importanceLevel: number;
  lastInteractionDate?: string;
  responsiveness?: number;
  campaignCount: number;
  notes?: string;
  introHistory?: string;
  followUpCommitment?: string;
  decayRisk: number;
}): number {
  const importanceScore = input.importanceLevel * 10;
  const recencyScore = input.lastInteractionDate ? Math.max(25, 100 - input.decayRisk) : 45;
  const responsivenessScore = Math.round((input.responsiveness ?? 0.62) * 100);
  const campaignScore = Math.min(100, input.campaignCount * 36);
  const historyScore = input.notes || input.introHistory ? 78 : 38;
  const followUpScore = input.followUpCommitment ? 82 : 48;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        importanceScore * 0.26 +
          recencyScore * 0.16 +
          responsivenessScore * 0.14 +
          campaignScore * 0.18 +
          historyScore * 0.14 +
          followUpScore * 0.12,
      ),
    ),
  );
}

function getRing(importanceLevel: number, score: number, campaignCount: number): RelationshipRing {
  if (importanceLevel >= 8 || score >= 78 || campaignCount > 0) {
    return "inner";
  }

  if (importanceLevel >= 6 || score >= 58) {
    return "core";
  }

  return "network";
}

function getIdentityKeys(contact: Pick<ImportedContactRecord, "email" | "name" | "company">): string[] {
  const keys: string[] = [];

  if (contact.email) {
    keys.push(`email:${contact.email}`);
  }

  if (contact.name && contact.company) {
    keys.push(`name-company:${normalizeIdentity(contact.name)}:${normalizeIdentity(contact.company)}`);
  }

  return keys;
}

function mergeContacts(existing: DraftContact, incoming: DraftContact): DraftContact {
  const mergedCampaignNames = Array.from(new Set([...existing.campaignNames, ...incoming.campaignNames]));
  const mergedCampaignIds = Array.from(new Set([...existing.campaignIds, ...incoming.campaignIds]));
  const mergedTags = Array.from(new Set([...existing.tags, ...incoming.tags]));
  const mergedIssues = Array.from(new Set([...existing.validationIssues, ...incoming.validationIssues]));
  const strongerContact = incoming.initialSocialEquityScore > existing.initialSocialEquityScore ? incoming : existing;

  return {
    ...existing,
    name: existing.name || incoming.name,
    role: existing.role ?? incoming.role,
    company: existing.company ?? incoming.company,
    email: existing.email ?? incoming.email,
    phone: existing.phone ?? incoming.phone,
    relationshipType: existing.relationshipType ?? incoming.relationshipType,
    lastInteractionDate: existing.lastInteractionDate ?? incoming.lastInteractionDate,
    notes: [existing.notes, incoming.notes].filter(Boolean).join(" | ") || undefined,
    tags: mergedTags,
    campaignNames: mergedCampaignNames,
    campaignIds: mergedCampaignIds,
    importanceLevel: Math.max(existing.importanceLevel, incoming.importanceLevel),
    sourceSystem: existing.sourceSystem ?? incoming.sourceSystem,
    introHistory: [existing.introHistory, incoming.introHistory].filter(Boolean).join(" | ") || undefined,
    responsiveness: Math.max(existing.responsiveness ?? 0, incoming.responsiveness ?? 0) || undefined,
    followUpCommitment: existing.followUpCommitment ?? incoming.followUpCommitment,
    podId: strongerContact.podId,
    podName: strongerContact.podName,
    category: strongerContact.category,
    ring: strongerContact.ring,
    initialSocialEquityScore: Math.max(existing.initialSocialEquityScore, incoming.initialSocialEquityScore),
    decayRisk: Math.max(existing.decayRisk, incoming.decayRisk),
    status: mergedIssues.length > 0 ? "review" : "ready",
    validationIssues: mergedIssues,
    mergedFrom: existing.mergedFrom + incoming.mergedFrom,
    rowNumbers: Array.from(new Set([...existing.rowNumbers, ...incoming.rowNumbers])).sort((left, right) => left - right),
    identityKeys: Array.from(new Set([...existing.identityKeys, ...incoming.identityKeys])),
  };
}

function buildContactFromRow(row: ContactImportRow, sourceName: string, rowNumber: number): DraftContact {
  const rawEmail = getValueByHeader(row, ["email", "email address", "work email", "primary email"]);
  const rawPhone = getValueByHeader(row, ["phone", "mobile", "phone number", "cell"]);
  const email = normalizeEmail(rawEmail);
  const phone = normalizePhone(rawPhone);
  const name =
    getValueByHeader(row, ["name", "full name", "person", "contact", "user", "first name"]) ??
    email?.split("@")[0].replace(/[._-]/g, " ") ??
    getFirstPopulatedValue(row) ??
    "";
  const role = getValueByHeader(row, ["role", "title", "job title", "position"]);
  const company = getValueByHeader(row, ["company", "organization", "account", "firm"]);
  const relationshipType = getValueByHeader(row, ["relationship type", "type", "category", "relationship category"]);
  const rawLastInteractionDate = getValueByHeader(row, ["last interaction date", "last interaction", "last touch", "last contacted"]);
  const lastInteractionDate = normalizeDate(rawLastInteractionDate);
  const notes = getValueByHeader(row, ["notes", "note", "summary", "context", "relationship notes"]);
  const tags = splitList(getValueByHeader(row, ["tags", "tag"]));
  const explicitCampaigns = splitList(getValueByHeader(row, ["campaign", "campaigns", "priority", "company priority"]));
  const importanceLevel = normalizeImportance(getValueByHeader(row, ["importance", "importance level", "priority", "priority level"]));
  const sourceSystem = getValueByHeader(row, ["source", "source system", "origin"]);
  const introHistory = getValueByHeader(row, ["intro history", "introduction history", "introduced by", "intro source"]);
  const responsiveness = normalizeResponsiveness(getValueByHeader(row, ["responsiveness", "response rate", "reply rate"]));
  const followUpCommitment = getValueByHeader(row, ["follow-up commitment", "follow up commitment", "next step", "commitment", "follow up"]);
  const searchText = [name, role, company, relationshipType, notes, tags.join(" "), explicitCampaigns.join(" "), introHistory, followUpCommitment]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const campaigns = detectCampaigns(searchText, explicitCampaigns);
  const pod = classifyPod(searchText, relationshipType);
  const validationIssues = [
    !name ? "Missing name" : undefined,
    !email && !company ? "Missing email or company identity signal" : undefined,
    rawEmail && !email ? "Invalid email" : undefined,
    rawLastInteractionDate && !lastInteractionDate ? "Invalid last interaction date" : undefined,
  ].filter(Boolean) as string[];
  const decayRisk = calculateDecayRisk(lastInteractionDate, followUpCommitment, importanceLevel);
  const initialSocialEquityScore = calculateInitialScore({
    importanceLevel,
    lastInteractionDate,
    responsiveness,
    campaignCount: campaigns.length,
    notes,
    introHistory,
    followUpCommitment,
    decayRisk,
  });
  const ring = getRing(importanceLevel, initialSocialEquityScore, campaigns.length);
  const contact = {
    id: makeRecordId(sourceName, rowNumber, name || email || `row-${rowNumber}`),
    rowNumbers: [rowNumber],
    name: name || `Imported contact ${rowNumber}`,
    role,
    company,
    email,
    phone,
    relationshipType,
    lastInteractionDate,
    notes,
    tags,
    campaignNames: campaigns.map((campaign) => campaign.name),
    campaignIds: campaigns.map((campaign) => campaign.id),
    importanceLevel,
    source: sourceName,
    sourceSystem,
    introHistory,
    responsiveness,
    followUpCommitment,
    podId: pod.podId,
    podName: pod.podName,
    category: pod.category,
    ring,
    initialSocialEquityScore,
    decayRisk,
    status: validationIssues.length > 0 ? "review" : "ready",
    validationIssues,
    mergedFrom: 1,
  } satisfies ImportedContactRecord;

  return {
    ...contact,
    identityKeys: getIdentityKeys(contact),
  };
}

function summarizeContacts(contacts: ImportedContactRecord[], totalRowsProcessed: number, duplicatesMerged: number): ImportSummary {
  const campaignsDetected = Array.from(new Set(contacts.flatMap((contact) => contact.campaignNames))).sort();
  const podCounts = new Map<string, { podId: string; podName: string; count: number }>();
  const reviewIssues = contacts.flatMap((contact) =>
    contact.validationIssues.flatMap((issue) => contact.rowNumbers.map((rowNumber) => ({ rowNumber, issue }))),
  );

  contacts.forEach((contact) => {
    const current = podCounts.get(contact.podId) ?? { podId: contact.podId, podName: contact.podName, count: 0 };
    current.count += 1;
    podCounts.set(contact.podId, current);
  });

  return {
    totalRowsProcessed,
    contactsImported: contacts.length,
    duplicatesMerged,
    rowsNeedingReview: new Set(reviewIssues.map((issue) => issue.rowNumber)).size,
    campaignsDetected,
    podsAssigned: Array.from(podCounts.values()).sort((left, right) => right.count - left.count),
    reviewIssues,
  };
}

export function processImportedContactRows(rows: ContactImportRow[], sourceName: string): ContactImportProcessingResult {
  const contacts: DraftContact[] = [];
  const identityIndex = new Map<string, number>();
  let duplicatesMerged = 0;

  rows.forEach((row, index) => {
    const contact = buildContactFromRow(row, sourceName, index + 2);
    const matchingIndex = contact.identityKeys.map((key) => identityIndex.get(key)).find((value) => value !== undefined);

    if (matchingIndex !== undefined) {
      contacts[matchingIndex] = mergeContacts(contacts[matchingIndex], contact);
      contacts[matchingIndex].identityKeys.forEach((key) => identityIndex.set(key, matchingIndex));
      duplicatesMerged += 1;
      return;
    }

    contacts.push(contact);
    contact.identityKeys.forEach((key) => identityIndex.set(key, contacts.length - 1));
  });

  const importedContacts = contacts
    .map((contact) => {
      const importedContact = { ...contact } as Partial<DraftContact>;
      delete importedContact.identityKeys;
      return importedContact as ImportedContactRecord;
    })
    .sort((left, right) => right.initialSocialEquityScore - left.initialSocialEquityScore);
  const summary = summarizeContacts(importedContacts, rows.length, duplicatesMerged);

  return {
    contacts: importedContacts,
    summary,
    warnings:
      summary.rowsNeedingReview > 0
        ? [`${summary.rowsNeedingReview} row${summary.rowsNeedingReview === 1 ? "" : "s"} need review before activation.`]
        : [],
  };
}

export function processImportedContactText(text: string, sourceName: string): ContactImportProcessingResult {
  const lines = text
    .split(/\r?\n/)
    .map(normalizeWhitespace)
    .filter((line) => line.length > 0);
  const candidateLines = lines.filter((line) => emailPattern.test(line) || phonePattern.test(line) || line.includes("|") || line.includes(","));
  const sourceLines = candidateLines.length > 0 ? candidateLines : lines.slice(0, 12);
  const rows = sourceLines.map((line) => {
    const email = line.match(emailPattern)?.[0];
    const phone = line.match(phonePattern)?.[0];
    const parts = line
      .split(/\s+\|\s+|,|;|\t/)
      .map(normalizeWhitespace)
      .filter(Boolean);
    const name = parts.find((part) => !part.includes("@") && !phonePattern.test(part));
    const role = parts.find((part) => /founder|partner|ceo|operator|advisor|recruiter|investor|director|manager|lead|vp/i.test(part));
    const company = parts.find((part) => part !== name && part !== role && !part.includes("@") && !phonePattern.test(part));

    return {
      Name: name,
      Role: role,
      Company: company,
      Email: email,
      Phone: phone,
      Notes: line,
    };
  });

  return processImportedContactRows(rows, sourceName);
}
