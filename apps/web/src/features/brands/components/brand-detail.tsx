// features/brands/components/brand-detail.tsx
// Presenter: Pure UI component for brand detail view

import { ArrowLeftIcon, Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { BrandIcon } from './brand-icon';
import { BrandWizard } from './brand-wizard';

type Brand = RouterOutput['brands']['get'];

export interface BrandDetailProps {
  brand: Brand;
  isDeleting: boolean;
  onDelete: () => void;
}

/**
 * Check if a brand is "new" (no meaningful content yet).
 */
function isNewBrand(brand: Brand): boolean {
  return (
    !brand.description &&
    !brand.mission &&
    brand.values.length === 0 &&
    !brand.brandGuide &&
    brand.personas.length === 0 &&
    brand.segments.length === 0
  );
}

/**
 * Brand detail presenter - displays brand information with edit capability.
 * Shows split view with brand info and chat builder.
 * Defaults to edit mode for new brands to start the conversational flow.
 */
export function BrandDetail({ brand, isDeleting, onDelete }: BrandDetailProps) {
  // Default to edit mode for new brands so conversation auto-starts
  const [isEditing, setIsEditing] = useState(() => isNewBrand(brand));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/brands"
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <BrandIcon colors={brand.colors} className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-semibold">{brand.name}</h1>
              {brand.mission && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {brand.mission}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Pencil1Icon className="w-4 h-4 mr-2" />
              {isEditing ? 'View' : 'Edit'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive"
            >
              {isDeleting ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <TrashIcon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isEditing ? (
          <BrandWizard brand={brand} />
        ) : (
          <BrandPreview brand={brand} />
        )}
      </div>
    </div>
  );
}

interface BrandPreviewProps {
  brand: Brand;
}

/**
 * Read-only preview of brand details.
 */
function BrandPreview({ brand }: BrandPreviewProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* Description */}
        {brand.description && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-muted-foreground">{brand.description}</p>
          </section>
        )}

        {/* Mission */}
        {brand.mission && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Mission</h2>
            <p className="text-muted-foreground">{brand.mission}</p>
          </section>
        )}

        {/* Values */}
        {brand.values.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Values</h2>
            <div className="flex flex-wrap gap-2">
              {brand.values.map((value, index) => (
                <Badge key={index} variant="default">
                  {value}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Colors */}
        {brand.colors && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Colors</h2>
            <div className="flex gap-4">
              <ColorSwatch label="Primary" color={brand.colors.primary} />
              {brand.colors.secondary && (
                <ColorSwatch label="Secondary" color={brand.colors.secondary} />
              )}
              {brand.colors.accent && (
                <ColorSwatch label="Accent" color={brand.colors.accent} />
              )}
            </div>
          </section>
        )}

        {/* Brand Guide */}
        {brand.brandGuide && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Brand Guide</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
              {brand.brandGuide}
            </div>
          </section>
        )}

        {/* Personas */}
        {brand.personas.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Personas</h2>
            <div className="grid gap-4">
              {brand.personas.map((persona) => (
                <div
                  key={persona.id}
                  className="p-4 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{persona.name}</span>
                    <Badge variant="info" className="text-xs">
                      {persona.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {persona.personalityDescription}
                  </p>
                  <p className="text-sm text-muted-foreground italic">
                    Style: {persona.speakingStyle}
                  </p>
                  {persona.exampleQuotes.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">
                        Example quotes:
                      </p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {persona.exampleQuotes.slice(0, 2).map((quote, i) => (
                          <li key={i}>"{quote}"</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Segments */}
        {brand.segments.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Target Segments</h2>
            <div className="grid gap-4">
              {brand.segments.map((segment) => (
                <div
                  key={segment.id}
                  className="p-4 rounded-lg border border-border bg-muted/30"
                >
                  <h3 className="font-medium mb-1">{segment.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {segment.description}
                  </p>
                  <p className="text-sm text-muted-foreground italic mb-2">
                    Tone: {segment.messagingTone}
                  </p>
                  {segment.keyBenefits.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {segment.keyBenefits.map((benefit, i) => (
                        <Badge key={i} variant="info" className="text-xs">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state if no content */}
        {!brand.description &&
          !brand.mission &&
          brand.values.length === 0 &&
          !brand.brandGuide &&
          brand.personas.length === 0 &&
          brand.segments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                This brand doesn't have any details yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Click "Edit" to start building your brand with AI assistance.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}

function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-md border border-border"
        style={{ backgroundColor: color }}
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground uppercase">{color}</p>
      </div>
    </div>
  );
}
