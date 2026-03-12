import { describe, expect, it } from 'vitest';
import {
  chatPersonaSystemPrompt,
  chatSynthesizePersonaSystemPrompt,
  renderPrompt,
} from '../index';

describe('persona prompts', () => {
  it('guides conversational persona intake toward podcast-ready hosts and co-hosts', () => {
    const rendered = renderPrompt(chatPersonaSystemPrompt);

    expect(rendered).toContain(
      'audio-ready for a recurring podcast host or co-host',
    );
    expect(rendered).toContain(
      'Use plain human-style names without honorifics, titles, or credentials.',
    );
    expect(rendered).toContain(
      'hosts should guide the listener and create structure; co-hosts should add chemistry, curiosity, pushback, or a contrasting lens.',
    );
    expect(rendered).toContain(
      'Example quotes should sound like real podcast lines, not slogans or self-introductions.',
    );
    expect(rendered).toContain(
      'Preserve any explicit male/female presentation or voice-sex preference the user gives',
    );
  });

  it('requires clean speaker names and on-mic roles during persona synthesis', () => {
    const rendered = renderPrompt(chatSynthesizePersonaSystemPrompt);

    expect(rendered).toContain('Name should be a clean speaker label');
    expect(rendered).toContain(
      'no honorifics, titles, prefixes, suffixes, or credentials',
    );
    expect(rendered).toContain(
      "Role should describe the persona's on-mic job in the show",
    );
    expect(rendered).toContain(
      'Good host roles create clarity, pacing, and listener trust.',
    );
    expect(rendered).toContain(
      'would actually say on air to open, clarify, challenge, react, or land a takeaway.',
    );
    expect(rendered).toContain(
      'If the conversation explicitly indicates the persona is male or female, choose a voice from that same sex.',
    );
  });
});
