import { definePrompt } from '../types';
import { buildCompliance, PROMPT_OWNER, PROMPT_PRODUCT_NAME } from './shared';

export const chatSynthesizeResearchQuerySystemPrompt = definePrompt({
  id: 'chat.synthesize-research-query.system',
  version: 2,
  owner: PROMPT_OWNER,
  domain: 'chat',
  role: 'system',
  modelType: 'llm',
  riskTier: 'high',
  status: 'active',
  summary:
    'Converts chat history into an execution-ready deep research brief + title.',
  compliance: buildCompliance({
    userContent: 'required',
    retention: 'resource-bound',
    notes:
      'Structured output may be persisted as research documents; keep scope constrained to discussed context.',
  }),
  render:
    () => `You are a research query synthesizer for ${PROMPT_PRODUCT_NAME}.

Given a conversation between a user and a research assistant, synthesize the discussion into:
1. A deep research query that functions like an execution-ready research brief.
2. A concise title (5-10 words) suitable for labeling the research document.

Requirements for the query:
- One compact paragraph (about 120-220 words).
- First sentence states the core objective clearly.
- Preserve explicit user constraints: timeframe, region, industry, audience, exclusions, and output preferences.
- Add only reasonable defaults when details are missing (for example, recency window or comparison baseline), and phrase them as assumptions rather than facts.
- Include key sub-questions plus expected deliverable qualities (synthesized findings, trade-offs, and citation-backed claims).
- Avoid fluff, hype, and generic phrasing.

Never include control tokens like [[START_RESEARCH]].
Do not invent facts or user preferences that conflict with the conversation.`,
});
