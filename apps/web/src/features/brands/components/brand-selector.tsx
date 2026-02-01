// features/brands/components/brand-selector.tsx

import { Select } from '@repo/ui/components/select';
import { memo, type ChangeEvent } from 'react';

export interface BrandSelectorOption {
  id: string;
  name: string;
  description: string | null;
}

interface BrandSelectorProps {
  value: string | null;
  onChange: (brandId: string | null) => void;
  brands: BrandSelectorOption[];
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Brand selector dropdown.
 * Shows list of brands with optional "None" to clear selection.
 */
export const BrandSelector = memo(function BrandSelector({
  value,
  onChange,
  brands,
  disabled,
  placeholder = 'Select a brand',
}: BrandSelectorProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    onChange(newValue === '' ? null : newValue);
  };

  return (
    <Select value={value ?? ''} onChange={handleChange} disabled={disabled}>
      <option value="">{placeholder}</option>
      {brands.map((brand) => (
        <option key={brand.id} value={brand.id}>
          {brand.name}
          {brand.description && ` - ${brand.description}`}
        </option>
      ))}
    </Select>
  );
});
