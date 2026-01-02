import {
  ChatBubbleIcon,
  SpeakerLoudIcon,
  MagicWandIcon,
} from '@radix-ui/react-icons';

type PodcastFormat = 'conversation' | 'voiceover' | 'voice_over';

interface StepBasicsProps {
  format: PodcastFormat;
}

export function StepBasics({ format }: StepBasicsProps) {
  const isConversation = format === 'conversation';

  return (
    <div className="setup-content">
      <div className="setup-step-header">
        <p className="setup-step-eyebrow">Step 1 of 4</p>
        <h2 className="setup-step-title">Let's Create Your Podcast</h2>
        <p className="setup-step-description">
          We'll guide you through selecting documents and settings. The AI will
          generate a perfect title based on your content.
        </p>
      </div>

      <div className="space-y-6">
        {/* AI-generated note */}
        <div className="setup-ai-note">
          <div className="setup-ai-note-icon">
            <MagicWandIcon />
          </div>
          <div className="setup-ai-note-content">
            <p className="setup-ai-note-title">AI-Powered Generation</p>
            <p className="setup-ai-note-description">
              Your podcast title, description, and tags will be automatically
              generated based on the documents you select.
            </p>
          </div>
        </div>

        {/* Format Display (read-only, set at creation) */}
        <div className="setup-field">
          <label className="setup-label">
            Format{' '}
            <span className="text-muted-foreground font-normal">
              (set at creation)
            </span>
          </label>
          <div className="setup-format-group">
            <div
              className={`setup-format-option ${isConversation ? 'selected' : ''}`}
            >
              <div className="setup-format-icon">
                {isConversation ? <ChatBubbleIcon /> : <SpeakerLoudIcon />}
              </div>
              <div className="setup-format-title">
                {isConversation ? 'Conversation' : 'Voice Over'}
              </div>
              <div className="setup-format-description">
                {isConversation
                  ? 'Two hosts discuss the content in a natural, engaging dialogue.'
                  : 'Single narrator presents the content in a clear, direct style.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
