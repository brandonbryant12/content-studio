import { describe, it, expect } from '@jest/globals';
import { buildSystemPrompt, buildUserPrompt } from '../prompts';

describe('buildSystemPrompt', () => {
  describe('conversation format', () => {
    it('should generate dialogue-focused prompt for conversation format', () => {
      const prompt = buildSystemPrompt('conversation');

      expect(prompt).toContain('dialogue between two hosts');
      expect(prompt).toContain('"host" and "co-host"');
      expect(prompt).toContain('back-and-forth conversation');
    });

    it('should append custom instructions when provided', () => {
      const customInstructions = 'Keep it casual and fun';
      const prompt = buildSystemPrompt('conversation', customInstructions);

      expect(prompt).toContain('Additional instructions from the user');
      expect(prompt).toContain(customInstructions);
    });
  });

  describe('voice_over format', () => {
    it('should generate monologue-focused prompt for voice_over format', () => {
      const prompt = buildSystemPrompt('voice_over');

      expect(prompt).toContain('engaging monologue');
      expect(prompt).toContain('"host" as the single speaker');
      expect(prompt).toContain('rhetorical questions');
    });

    it('should append custom instructions when provided', () => {
      const customInstructions = 'Focus on technical details';
      const prompt = buildSystemPrompt('voice_over', customInstructions);

      expect(prompt).toContain('Additional instructions from the user');
      expect(prompt).toContain(customInstructions);
    });
  });

  it('should not include custom instructions section when not provided', () => {
    const prompt = buildSystemPrompt('conversation');

    expect(prompt).not.toContain('Additional instructions');
  });
});

describe('buildUserPrompt', () => {
  const sampleContent = 'This is the document content about AI.';

  it('should include document content in the prompt', () => {
    const prompt = buildUserPrompt({}, sampleContent);

    expect(prompt).toContain(sampleContent);
    expect(prompt).toContain('Source content:');
  });

  it('should include working title when provided', () => {
    const podcast = { title: 'My Podcast Episode' };
    const prompt = buildUserPrompt(podcast, sampleContent);

    expect(prompt).toContain('Working title: "My Podcast Episode"');
  });

  it('should include working description when both title and description provided', () => {
    const podcast = {
      title: 'My Podcast Episode',
      description: 'An episode about AI',
    };
    const prompt = buildUserPrompt(podcast, sampleContent);

    expect(prompt).toContain('Working title: "My Podcast Episode"');
    expect(prompt).toContain('Working description: An episode about AI');
  });

  it('should not include title section when title is null', () => {
    const podcast = { title: null, description: 'Some description' };
    const prompt = buildUserPrompt(podcast, sampleContent);

    expect(prompt).not.toContain('Working title');
    expect(prompt).not.toContain('Working description');
  });

  it('should request all required output fields', () => {
    const prompt = buildUserPrompt({}, sampleContent);

    expect(prompt).toContain('compelling title');
    expect(prompt).toContain('brief description');
    expect(prompt).toContain('summary');
    expect(prompt).toContain('tags/keywords');
    expect(prompt).toContain('full script with speaker segments');
  });
});
