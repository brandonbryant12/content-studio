// features/infographics/components/workbench/type-selector.tsx

/**
 * Available infographic types.
 * Matches INFOGRAPHIC_TYPES from @repo/media.
 */
const INFOGRAPHIC_TYPES = [
  {
    id: 'timeline',
    name: 'Timeline',
    description: 'Chronological events, history, or project milestones',
    icon: 'clock',
  },
  {
    id: 'comparison',
    name: 'Comparison',
    description: 'Side-by-side analysis of options, products, or concepts',
    icon: 'columns',
  },
  {
    id: 'statistical',
    name: 'Statistical',
    description: 'Data visualization with charts, graphs, and numbers',
    icon: 'bar-chart',
  },
  {
    id: 'process',
    name: 'Process Flow',
    description: 'Step-by-step procedures, workflows, or instructions',
    icon: 'git-branch',
  },
  {
    id: 'list',
    name: 'List',
    description: 'Key points, features, benefits, or tips',
    icon: 'list',
  },
  {
    id: 'mindMap',
    name: 'Mind Map',
    description: 'Central concept with branching related ideas',
    icon: 'share-2',
  },
  {
    id: 'hierarchy',
    name: 'Hierarchy',
    description: 'Organizational structures, taxonomies, or rankings',
    icon: 'layers',
  },
  {
    id: 'geographic',
    name: 'Geographic',
    description: 'Location-based data, regional comparisons, or maps',
    icon: 'map',
  },
] as const;

type InfographicTypeInfo = (typeof INFOGRAPHIC_TYPES)[number];

export interface TypeSelectorProps {
  /** Currently selected type */
  value: string;
  /** Callback when type is selected */
  onChange: (type: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * Grid of infographic type cards with icons.
 * Allows user to select the type of infographic to generate.
 */
export function TypeSelector({
  value,
  onChange,
  disabled = false,
}: TypeSelectorProps) {
  return (
    <div className="type-selector">
      <label className="type-selector-label">Infographic Type</label>
      <div className="type-selector-grid">
        {INFOGRAPHIC_TYPES.map((type) => (
          <TypeCard
            key={type.id}
            type={type}
            isSelected={value === type.id}
            onClick={() => onChange(type.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

interface TypeCardProps {
  type: InfographicTypeInfo;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}

function TypeCard({ type, isSelected, onClick, disabled }: TypeCardProps) {
  const className = `type-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-pressed={isSelected}
    >
      <div className="type-card-icon">
        <TypeIcon iconName={type.icon} />
      </div>
      <div className="type-card-content">
        <span className="type-card-name">{type.name}</span>
        <span className="type-card-description">{type.description}</span>
      </div>
    </button>
  );
}

function TypeIcon({ iconName }: { iconName: string }) {
  const iconProps = {
    className: 'w-5 h-5',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: '1.5',
  };

  switch (iconName) {
    case 'clock':
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );

    case 'columns':
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 4.5v15m6-15v15M4.5 4.5h15v15h-15z"
          />
        </svg>
      );

    case 'bar-chart':
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      );

    case 'git-branch':
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
          />
        </svg>
      );

    case 'list':
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      );

    case 'share-2':
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
          />
        </svg>
      );

    case 'layers':
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3"
          />
        </svg>
      );

    case 'map':
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
          />
        </svg>
      );

    default:
      return (
        <svg {...iconProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      );
  }
}
