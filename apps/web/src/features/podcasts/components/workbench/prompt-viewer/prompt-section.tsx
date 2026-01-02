import { ChevronDownIcon } from '@radix-ui/react-icons';
import { useState } from 'react';

interface PromptSectionProps {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function PromptSection({
  icon,
  title,
  badge,
  defaultOpen = false,
  children,
}: PromptSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="prompt-section">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="prompt-section-trigger"
      >
        <div className="prompt-section-header">
          <div className="prompt-section-icon">{icon}</div>
          <h4 className="prompt-section-title">{title}</h4>
          {badge}
        </div>
        <ChevronDownIcon
          className={`prompt-section-chevron ${isOpen ? 'expanded' : ''}`}
        />
      </button>
      {isOpen && <div className="prompt-section-content">{children}</div>}
    </div>
  );
}
