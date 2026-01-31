// features/brands/hooks/use-quick-replies.ts
// Hook to generate context-aware quick reply suggestions

import { useMemo } from 'react';
import type { BrandProgress } from './use-brand-progress';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Generate context-aware quick reply suggestions based on conversation state.
 * Designed to encourage exploration and collaboration, not just yes/no responses.
 */
export function useQuickReplies(
  progress: BrandProgress,
  messages: ChatMessage[],
): string[] {
  return useMemo(() => {
    // No messages yet - show getting started
    if (messages.length === 0) {
      return ["Let's get started", 'I have some ideas already'];
    }

    // Get the last assistant message
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant');

    if (!lastAssistantMessage) {
      return [];
    }

    const msg = lastAssistantMessage.content.toLowerCase();

    // When AI asks for confirmation
    if (
      msg.includes('does this capture') ||
      msg.includes('is that right') ||
      msg.includes('feel right') ||
      msg.includes('sound good') ||
      msg.includes('what do you think')
    ) {
      return [
        "Yes, that's it!",
        'Almost - let me refine',
        "Let's try a different angle",
      ];
    }

    // When AI offers options/suggestions
    if (
      msg.includes('which resonates') ||
      msg.includes('any of these') ||
      msg.includes('what direction') ||
      msg.includes('which speaks to you')
    ) {
      return [
        'I like the first one',
        'Mix of a few',
        "None quite fit - here's my take",
      ];
    }

    // Persona-related - encourage exploration
    if (
      msg.includes('persona') ||
      msg.includes('character voice') ||
      msg.includes('podcast host')
    ) {
      if (msg.includes('would you like') || msg.includes('want to')) {
        return [
          "Yes, let's create one!",
          'Tell me more about personas',
          'Skip for now',
        ];
      }
      if (msg.includes('name') && msg.includes('role')) {
        return ['I have someone in mind', 'Help me brainstorm'];
      }
    }

    // Segment-related - encourage exploration
    if (
      msg.includes('segment') ||
      msg.includes('audience') ||
      msg.includes('who are')
    ) {
      if (msg.includes('would you like') || msg.includes('want to')) {
        return [
          "Yes, let's define them",
          'Help me think through this',
          'Skip for now',
        ];
      }
    }

    // When exploring description/mission
    if (
      msg.includes('tell me about') ||
      msg.includes('what does') ||
      msg.includes("what's the big idea")
    ) {
      return [
        "Here's the short version",
        "It's kind of complicated",
        'Can you help me articulate it?',
      ];
    }

    // When exploring purpose/mission
    if (
      msg.includes('why does') ||
      msg.includes('bigger picture') ||
      msg.includes('purpose') ||
      msg.includes('believe')
    ) {
      return [
        'I know exactly why',
        'Still figuring that out',
        'Help me find the words',
      ];
    }

    // When exploring values
    if (msg.includes('values') || msg.includes('principles')) {
      return [
        'I have a few in mind',
        'Suggest some based on what I shared',
        "Let's explore together",
      ];
    }

    // When exploring colors
    if (msg.includes('color')) {
      return [
        'I have brand colors already',
        'Suggest options for me',
        'Skip colors for now',
      ];
    }

    // When exploring voice/tone
    if (
      msg.includes('how should') &&
      (msg.includes('sound') || msg.includes('talk'))
    ) {
      return [
        'Friendly and approachable',
        'Professional but warm',
        'Help me figure it out',
      ];
    }

    // Completion/celebration messages
    if (
      msg.includes('looking solid') ||
      msg.includes('looking great') ||
      msg.includes('shaping up') ||
      msg.includes('nicely')
    ) {
      return [
        'Add another persona',
        'Define another segment',
        "Let's refine something",
        "I'm happy with this",
      ];
    }

    // When AI is digging deeper / riffing
    if (
      msg.includes('tell me more') ||
      msg.includes('interesting') ||
      msg.includes('dig into')
    ) {
      return ["Here's more context", 'Actually, let me rethink that'];
    }

    // Default - if there are incomplete items, offer to explore
    if (progress.nextIncomplete && progress.percentage < 60) {
      return ['Help me with suggestions', "I'll type my answer"];
    }

    return [];
  }, [messages, progress]);
}
