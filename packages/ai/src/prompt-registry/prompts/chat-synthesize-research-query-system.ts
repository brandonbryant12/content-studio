import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER } from './shared';

export const chatSynthesizeResearchQuerySystemPrompt = definePrompt({
  id: 'chat.synthesize-research-query.system',
  version: 1,
  owner: PROMPT_OWNER,
  domain: 'chat',
  role: 'system',
  modelType: 'llm',
  riskTier: 'high',
  status: 'active',
  summary:
    'Converts research chat history into a focused research query + title.',
  compliance: buildCompliance({
    userContent: 'required',
    retention: 'resource-bound',
    notes:
      'Structured output may be persisted as research documents; keep scope constrained to discussed context.',
  }),
  render: () => `You are a research query synthesizer for Content Studio.

Given a conversation between a user and a research assistant, synthesize the discussion into:
1. A focused research query (2-4 sentences max) that captures the user's intent and any refinements from the conversation.
2. A concise title (5-10 words) suitable for labeling the research document.

Keep the query brief and specific. Do not elaborate beyond what was discussed.`,
});
