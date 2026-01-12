// features/infographics/components/workbench/settings-panel.tsx

import { ChevronDownIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { Input } from '@repo/ui/components/input';
import type { UseInfographicSettingsReturn } from '../../hooks/use-infographic-settings';
import { TypeSelector } from './type-selector';
import { AspectRatioSelector } from './aspect-ratio-selector';
import { CustomInstructions } from './custom-instructions';
import { StyleOptionsPanel } from './style-options';
import { FeedbackPanel } from './feedback-panel';

export interface SettingsPanelProps {
  /** Settings hook return value */
  settings: UseInfographicSettingsReturn;
  /** Whether the infographic has been generated at least once */
  hasGenerated: boolean;
  /** Whether the panel is disabled (e.g., during generation) */
  disabled?: boolean;
}

/**
 * Combined settings panel for infographic configuration.
 * Includes type, aspect ratio, custom instructions, style options, and feedback.
 */
export function SettingsPanel({
  settings,
  hasGenerated,
  disabled = false,
}: SettingsPanelProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  return (
    <div className="settings-panel">
      {/* Title Input */}
      <div className="settings-panel-section">
        <label className="settings-panel-label" htmlFor="infographic-title">
          Title
        </label>
        <Input
          id="infographic-title"
          value={settings.title}
          onChange={(e) => settings.setTitle(e.target.value)}
          disabled={disabled}
          placeholder="Enter a title for your infographic..."
          className="settings-panel-title-input"
        />
      </div>

      {/* Type Selector */}
      <div className="settings-panel-section">
        <TypeSelector
          value={settings.infographicType}
          onChange={settings.setInfographicType}
          disabled={disabled}
        />
      </div>

      {/* Aspect Ratio */}
      <div className="settings-panel-section">
        <AspectRatioSelector
          value={settings.aspectRatio}
          onChange={settings.setAspectRatio}
          disabled={disabled}
        />
      </div>

      {/* Feedback Panel (only shown after first generation) */}
      {hasGenerated && (
        <div className="settings-panel-section">
          <FeedbackPanel
            value={settings.feedbackInstructions}
            onChange={settings.setFeedbackInstructions}
            disabled={disabled}
            hasGenerated={hasGenerated}
          />
        </div>
      )}

      {/* Advanced Options (collapsible) */}
      <div className="settings-panel-advanced">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="settings-panel-advanced-toggle"
        >
          <span>Advanced Options</span>
          <ChevronDownIcon
            className={`settings-panel-advanced-chevron ${isAdvancedOpen ? 'expanded' : ''}`}
          />
        </button>

        {isAdvancedOpen && (
          <div className="settings-panel-advanced-content">
            {/* Custom Instructions */}
            <div className="settings-panel-section">
              <CustomInstructions
                value={settings.customInstructions}
                onChange={settings.setCustomInstructions}
                disabled={disabled}
              />
            </div>

            {/* Style Options */}
            <div className="settings-panel-section">
              <StyleOptionsPanel
                value={settings.styleOptions}
                onChange={settings.setStyleOptions}
                disabled={disabled}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
