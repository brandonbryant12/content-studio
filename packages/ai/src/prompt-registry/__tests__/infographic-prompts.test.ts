import { describe, expect, it } from 'vitest';
import { infographicTitleUserPrompt, renderPrompt } from '../index';

describe('infographicTitleUserPrompt', () => {
  it('renders explicit title constraints', () => {
    const result = renderPrompt(infographicTitleUserPrompt, {
      sourcePrompt:
        'Create an infographic about quarter-over-quarter SaaS growth',
    });

    expect(result).toContain('Create exactly one concise infographic title.');
    expect(result).toContain('Requirements:');
    expect(result).toContain('- 3 to 6 words.');
    expect(result).toContain(
      '- Favor words that will render cleanly and legibly in an image.',
    );
    expect(result).toContain('- Use title case.');
    expect(result).toContain('- Return only the title text.');
    expect(result).toContain(
      'Source query: "Create an infographic about quarter-over-quarter SaaS growth"',
    );
  });

  it('trims the source prompt before rendering', () => {
    const result = renderPrompt(infographicTitleUserPrompt, {
      sourcePrompt: '  Revenue retention breakdown  ',
    });

    expect(result).toContain('Source query: "Revenue retention breakdown"');
  });
});
