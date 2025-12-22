import { useState } from 'react';
import { ChevronDownIcon } from '@radix-ui/react-icons';

interface CollapsibleSectionProps {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  icon,
  title,
  badge,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-section">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="collapsible-section-trigger"
      >
        <div className="collapsible-section-header">
          <div className="collapsible-section-icon">{icon}</div>
          <h3 className="collapsible-section-title">{title}</h3>
          {badge}
        </div>
        <ChevronDownIcon
          className={`collapsible-section-chevron ${isOpen ? 'expanded' : ''}`}
        />
      </button>
      {isOpen && <div className="collapsible-section-content">{children}</div>}
    </div>
  );
}
