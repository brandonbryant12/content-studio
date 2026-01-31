import { StarFilledIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import { useQuery } from '@tanstack/react-query';
import {
  BrandSelector,
  PersonaSelector,
  SegmentSelector,
  type BrandSelectorOption,
  type PersonaSelectorOption,
  type SegmentSelectorOption,
} from '@/features/brands/components';
import { apiClient } from '@/clients/apiClient';

interface StepBrandProps {
  selectedBrandId: string | null;
  selectedPersonaId: string | null;
  selectedSegmentId: string | null;
  onBrandChange: (brandId: string | null) => void;
  onPersonaChange: (persona: PersonaSelectorOption | null) => void;
  onSegmentChange: (segment: SegmentSelectorOption | null) => void;
}

export function StepBrand({
  selectedBrandId,
  selectedPersonaId,
  selectedSegmentId,
  onBrandChange,
  onPersonaChange,
  onSegmentChange,
}: StepBrandProps) {
  // Fetch brand list
  const { data: brands, isLoading: loadingBrands } = useQuery(
    apiClient.brands.list.queryOptions({ input: {} }),
  );

  // Fetch selected brand details for personas/segments
  const { data: selectedBrand, isLoading: loadingBrand } = useQuery({
    ...apiClient.brands.get.queryOptions({
      input: { id: selectedBrandId ?? '' },
    }),
    enabled: !!selectedBrandId,
  });

  // Transform brands to selector options
  const brandOptions: BrandSelectorOption[] = (brands ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
  }));

  // Get personas and segments from selected brand
  const personas: PersonaSelectorOption[] = (selectedBrand?.personas ?? []).map(
    (p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      voiceId: p.voiceId,
      personalityDescription: p.personalityDescription,
    }),
  );

  const segments: SegmentSelectorOption[] = (selectedBrand?.segments ?? []).map(
    (s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      messagingTone: s.messagingTone,
    }),
  );

  const handleBrandChange = (brandId: string | null) => {
    onBrandChange(brandId);
    // Clear persona and segment when brand changes
    if (!brandId || brandId !== selectedBrandId) {
      onPersonaChange(null);
      onSegmentChange(null);
    }
  };

  return (
    <div className="setup-content">
      <div className="setup-step-header">
        <p className="setup-step-eyebrow">Step 2 of 4</p>
        <h2 className="setup-step-title">Brand & Voice</h2>
        <p className="setup-step-description">
          Optionally select a brand to use its personas and segments. This step
          can be skipped.
        </p>
      </div>

      {/* Brand Selector */}
      <div className="setup-field">
        <label className="setup-label">
          Brand{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        {loadingBrands ? (
          <div className="loading-center py-4">
            <Spinner className="w-5 h-5" />
          </div>
        ) : brandOptions.length === 0 ? (
          <div className="setup-brand-empty">
            <div className="setup-brand-empty-icon">
              <StarFilledIcon className="w-5 h-5" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              No brands yet. You can create brands in the Brands section to use
              personas and segments here.
            </p>
          </div>
        ) : (
          <BrandSelector
            value={selectedBrandId}
            onChange={handleBrandChange}
            brands={brandOptions}
            placeholder="Select a brand (optional)"
          />
        )}
      </div>

      {/* Show persona and segment selectors when brand is selected */}
      {selectedBrandId && (
        <>
          {loadingBrand ? (
            <div className="loading-center py-8">
              <Spinner className="w-5 h-5" />
            </div>
          ) : (
            <>
              {/* Persona Selector */}
              <div className="setup-field mt-6">
                <label className="setup-label">
                  Persona{' '}
                  <span className="text-muted-foreground font-normal">
                    (sets host voice)
                  </span>
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  Selecting a persona will auto-fill the host voice setting.
                </p>
                <PersonaSelector
                  value={selectedPersonaId}
                  onChange={onPersonaChange}
                  personas={personas}
                />
              </div>

              {/* Segment Selector */}
              <div className="setup-field mt-6">
                <label className="setup-label">
                  Target Audience{' '}
                  <span className="text-muted-foreground font-normal">
                    (sets messaging tone)
                  </span>
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  Selecting a segment will add messaging guidance to
                  instructions.
                </p>
                <SegmentSelector
                  value={selectedSegmentId}
                  onChange={onSegmentChange}
                  segments={segments}
                  placeholder="Select target audience (optional)"
                />
              </div>
            </>
          )}
        </>
      )}

      <p className="setup-hint text-center mt-6">
        This step is optional. Skip to continue without brand settings.
      </p>
    </div>
  );
}
