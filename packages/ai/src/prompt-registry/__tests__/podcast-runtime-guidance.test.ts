import { describe, expect, it } from 'vitest';
import {
  podcastPlanSystemPrompt,
  podcastScriptSystemPrompt,
  podcastScriptUserPrompt,
} from '../prompts';
import { renderPrompt } from '../render';

describe('podcast runtime guidance prompts', () => {
  it('keeps planner guidance close to the selected runtime', () => {
    const rendered = renderPrompt(podcastPlanSystemPrompt, {
      format: 'conversation',
      targetDurationMinutes: 7,
      hostPersonaName: 'Alex Stone',
      coHostPersonaName: 'Riley Fox',
    });

    expect(rendered).toContain(
      'Keep the sum of section estimatedMinutes within about 1 minute of the target runtime.',
    );
    expect(rendered).toContain(
      'Avoid both rushed under-planning and shallow filler.',
    );
  });

  it('adds an explicit spoken word budget and section expansion guidance', () => {
    const rendered = renderPrompt(podcastScriptSystemPrompt, {
      format: 'conversation',
      targetDurationMinutes: 7,
      episodePlan: {
        angle: 'Focus on rollout discipline over hype.',
        openingHook: 'The hard part of AI is not the model, it is the process.',
        closingTakeaway: 'Start with one workflow and tighten feedback loops.',
        sections: [
          {
            heading: 'Why launches stall',
            summary: 'Common operational gaps that kill momentum.',
            keyPoints: ['No owner', 'Weak source quality'],
            sourceIds: ['doc_alpha'],
            estimatedMinutes: 2,
          },
        ],
      },
    });

    expect(rendered).toContain(
      'reads conversation episodes at about 175 spoken words per minute.',
    );
    expect(rendered).toContain(
      'Target about 1225 spoken words overall after excluding TTS annotations',
    );
    expect(rendered).toContain('Target words: about 350');
    expect(rendered).toContain('silently verify the spoken-word total');
    expect(rendered).toContain(
      'Expand each approved section to match both its estimatedMinutes and its target word budget.',
    );
    expect(rendered).toContain(
      'most turns should contain developed explanation',
    );
    expect(rendered).toContain(
      'Deliver a full episode draft, not a short recap or outline.',
    );
  });

  it('adds a full-episode arc requirement when no saved plan is present', () => {
    const rendered = renderPrompt(podcastScriptSystemPrompt, {
      format: 'conversation',
      targetDurationMinutes: 7,
    });

    expect(rendered).toContain(
      'Build a complete episode arc even without a saved plan.',
    );
    expect(rendered).toContain('Cover 3 to 5 developed body beats');
    expect(rendered).toContain('End with a concrete closing takeaway');
  });

  it('repeats runtime expectations in the user prompt', () => {
    const rendered = renderPrompt(podcastScriptUserPrompt, {
      title: 'AI Team Playbook',
      description: 'Operational guidance for shipping AI features safely',
      format: 'conversation',
      targetDurationMinutes: 7,
      sourceContent:
        'Use clear ownership, safety checks, and measurable outcomes.',
    });

    expect(rendered).toContain('Target spoken runtime: about 7 minutes.');
    expect(rendered).toContain('deliver about 1225 spoken words overall');
    expect(rendered).toContain('1100-1350 word range');
    expect(rendered).toContain(
      'Build a complete episode with an opening, developed middle sections, and a closing takeaway.',
    );
    expect(rendered).toContain(
      'do not compress the material into a brief recap',
    );
  });
});
