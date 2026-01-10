# Task 03: Infographic Prompts

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `packages/media/src/podcast/prompts.ts` - Reference for prompt structure

## Context

Infographic prompts guide Gemini to create visually appealing, readable infographics. Each type needs a specialized prompt that:
1. Describes the visual structure expected
2. Guides text placement and hierarchy
3. Ensures readability and clarity
4. Maintains consistent professional quality

The prompts will be combined with:
- User's selected text (content)
- Custom instructions (optional user additions)
- Feedback instructions (for regeneration)

## Key Files

### Create New Files:
- `packages/media/src/infographic/prompts.ts`
- `packages/media/src/infographic/index.ts`

## Implementation Notes

### Infographic Types

```typescript
export const InfographicType = {
  TIMELINE: 'timeline',
  COMPARISON: 'comparison',
  STATISTICAL: 'statistical',
  PROCESS: 'process',
  LIST: 'list',
  MIND_MAP: 'mindMap',
  HIERARCHY: 'hierarchy',
  GEOGRAPHIC: 'geographic',
} as const;

export type InfographicType = (typeof InfographicType)[keyof typeof InfographicType];

export interface InfographicTypeInfo {
  id: InfographicType;
  name: string;
  description: string;
  icon: string;  // Icon name for UI
}

export const INFOGRAPHIC_TYPES: readonly InfographicTypeInfo[] = [
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
];
```

### System Prompts by Type

```typescript
const SYSTEM_PROMPTS: Record<InfographicType, string> = {
  timeline: `You are an expert infographic designer creating a timeline visualization.

Design principles:
- Use a clear chronological flow (left-to-right or top-to-bottom)
- Each event should have a distinct visual marker (circle, icon, or badge)
- Include dates/periods prominently
- Use connecting lines to show progression
- Vary colors or sizes to indicate importance
- Keep text concise - max 2-3 lines per event
- Ensure strong visual hierarchy with the timeline as the anchor

Visual style:
- Modern, clean design with ample white space
- Professional color palette (2-3 complementary colors)
- Clear, readable typography (sans-serif for body, can accent headers)
- Icons or simple illustrations to reinforce key events`,

  comparison: `You are an expert infographic designer creating a comparison visualization.

Design principles:
- Use clear side-by-side or grid layout
- Each item being compared should have equal visual weight
- Use consistent categories/criteria for comparison
- Highlight differences with color coding or icons
- Include summary or recommendation if appropriate
- Use checkmarks, X marks, or scales for quick scanning

Visual style:
- Balanced, symmetrical layout
- Distinct colors for each compared item
- Clear labels and headers
- Visual indicators (icons, badges) for key differentiators`,

  statistical: `You are an expert infographic designer creating a data visualization.

Design principles:
- Choose appropriate chart types (bar, pie, line, etc.) for the data
- Make numbers prominent and easy to read
- Use scale and proportion accurately
- Include clear labels and legends
- Highlight key statistics or insights
- Use color to group or differentiate data points

Visual style:
- Clean, minimal chart design
- Large, bold numbers for key statistics
- Consistent color scheme for data categories
- Clear axis labels and data labels
- Use icons to represent categories when appropriate`,

  process: `You are an expert infographic designer creating a process flow visualization.

Design principles:
- Show clear sequential steps with numbered markers
- Use arrows or connectors to show flow direction
- Each step should be visually distinct
- Include brief action text for each step
- Consider decision points or branches if needed
- Start and end points should be clearly marked

Visual style:
- Clean flowchart aesthetic
- Consistent shape for each step type
- Directional arrows with good contrast
- Step numbers prominently displayed
- Icons to represent actions`,

  list: `You are an expert infographic designer creating a list visualization.

Design principles:
- Use visual hierarchy to prioritize items
- Include icons or bullets for each item
- Group related items if applicable
- Keep text concise and scannable
- Consider numbering for ordered lists
- Use spacing to separate items clearly

Visual style:
- Clean, organized layout
- Distinctive icons or bullets for each item
- Consistent typography and spacing
- Optional: vary sizes for importance
- Optional: use color to categorize`,

  mindMap: `You are an expert infographic designer creating a mind map visualization.

Design principles:
- Central concept should be visually dominant
- Branches radiate outward logically
- Sub-branches connect clearly to parent branches
- Use color coding for different branches
- Keep node text brief (1-3 words ideal)
- Show relationships through proximity and connection

Visual style:
- Organic, branching layout
- Different colors for main branches
- Curved connecting lines
- Central node is largest
- Decreasing size as branches extend outward`,

  hierarchy: `You are an expert infographic designer creating a hierarchy visualization.

Design principles:
- Clear top-to-bottom or left-to-right structure
- Parent-child relationships clearly shown
- Use consistent node shapes and sizes per level
- Include labels for all nodes
- Show levels through vertical positioning
- Consider using icons for different node types

Visual style:
- Organized tree or pyramid structure
- Connecting lines between levels
- Color variation by level or category
- Professional, structured appearance
- Clear level indicators`,

  geographic: `You are an expert infographic designer creating a geographic visualization.

Design principles:
- Use stylized map or location markers
- Data should be tied to specific regions/locations
- Include legend for any data visualization
- Consider using icons for location types
- Show scale or context if needed
- Highlight key regions or data points

Visual style:
- Simplified, stylized map design
- Color coding for data ranges
- Clear location markers or pins
- Legend with data ranges
- Optional: use icons for location types`,
};
```

### Build Prompt Function

```typescript
export interface BuildPromptInput {
  type: InfographicType;
  selections: Array<{
    text: string;
    documentTitle?: string;
  }>;
  customInstructions?: string;
  feedbackInstructions?: string;
  aspectRatio: string;
}

export const buildInfographicPrompt = (input: BuildPromptInput): string => {
  const systemPrompt = SYSTEM_PROMPTS[input.type];

  const contentSection = input.selections
    .map((sel, i) => {
      const source = sel.documentTitle ? ` (from "${sel.documentTitle}")` : '';
      return `${i + 1}. ${sel.text}${source}`;
    })
    .join('\n\n');

  let prompt = `${systemPrompt}

## Content to Visualize

${contentSection}

## Requirements

- Aspect ratio: ${input.aspectRatio}
- Create a single, cohesive infographic image
- All text must be clearly readable
- Use professional, modern design aesthetics
- Ensure good contrast between text and background`;

  if (input.customInstructions) {
    prompt += `

## Additional Instructions

${input.customInstructions}`;
  }

  if (input.feedbackInstructions) {
    prompt += `

## Feedback to Address

${input.feedbackInstructions}`;
  }

  return prompt;
};
```

### Exports

```typescript
// packages/media/src/infographic/index.ts
export * from './prompts';
```

## Verification Log

<!-- Agent writes verification results here -->
