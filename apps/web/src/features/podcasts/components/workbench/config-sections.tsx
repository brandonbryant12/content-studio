import { FileTextIcon, SpeakerLoudIcon } from '@radix-ui/react-icons';
import type { ElementType } from 'react';

export type ConfigSection = 'voice' | 'sources';

type IconComponent = ElementType<{
  className?: string;
  'aria-hidden'?: boolean;
}>;

export interface ConfigSectionDefinition {
  value: ConfigSection;
  label: string;
  title: string;
  description: string;
  Icon: IconComponent;
  iconVariant: string;
}

export const configSectionDefinitions: ReadonlyArray<ConfigSectionDefinition> =
  [
    {
      value: 'voice',
      label: 'Voice',
      title: 'Voice Mixer',
      description:
        'Choose host voices and optional persona assignments for the next output.',
      Icon: SpeakerLoudIcon,
      iconVariant: 'voice',
    },
    {
      value: 'sources',
      label: 'Sources',
      title: 'Sources',
      description: 'Review or remove the source set behind this episode.',
      Icon: FileTextIcon,
      iconVariant: 'sources',
    },
  ];

export function getConfigSectionDefinition(
  section: ConfigSection,
): ConfigSectionDefinition {
  const definition = configSectionDefinitions.find(
    (candidate) => candidate.value === section,
  );

  if (!definition) {
    throw new Error(`Unknown podcast config section: ${section}`);
  }

  return definition;
}
