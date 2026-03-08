export const PRODUCT_NAME = 'Creator Studio' as const;

export const ProductBranding = {
  PRODUCT_NAME,
  AI_PRODUCT_NAME: `AI ${PRODUCT_NAME}`,
} as const;

export type ProductBranding = typeof ProductBranding;

export const formatProductPageTitle = (pageName?: string): string =>
  pageName ? `${pageName} - ${PRODUCT_NAME}` : PRODUCT_NAME;

export const APP_NAME = ProductBranding.PRODUCT_NAME;
export const AI_APP_NAME = ProductBranding.AI_PRODUCT_NAME;
