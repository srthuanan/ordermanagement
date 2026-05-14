import pricingRawText from '../../congcutinhgia.txt?raw';

const RAW_MARKER = 'Dữ liệu thô đầy đủ (JSON):';

export type PricingFee = {
  id: string;
  name: string;
  amountHnHcm: number;
  amountOther: number;
};

export type PricingColor = {
  id: string;
  name: string;
  image: string;
  color_code: string;
  is_advanced: boolean;
};

export type PricingModel = {
  id: string;
  name: string;
  image: string;
  brochure_url: string;
};

export type PricingVersion = {
  id: string;
  modelId: string;
  name: string;
  basePrice: number;
  specificPromotions: Record<string, number>;
  advancedColorPrice: number | null;
  depositDiscount: number | null;
  bodyInsuranceAmount: number | null;
  depositAmount: number;
  colors: PricingColor[];
  promoFlags: Record<string, boolean>;
};

export type PricingPromotion = {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  useSpecificValue: boolean;
  incompatibleWith: string[];
  applicableTo: string[];
  calculationBase: 'list_price' | 'discounted_price';
  isFuelSwap: boolean;
  versionOverrides: Record<string, number>;
};

export type PricingCustomerType = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  allowsDeposit: boolean;
  allowsVinclub: boolean;
};

export type PricingVinClubTier = {
  id: string;
  name: string;
  discountPercentage: number;
};

export type PricingOptionalFee = {
  id: string;
  name: string;
  defaultAmount: number;
};

export type PricingDataset = {
  models: PricingModel[];
  versions: PricingVersion[];
  promotions: PricingPromotion[];
  fees: PricingFee[];
  vinClubTiers: PricingVinClubTier[];
  optionalFees: PricingOptionalFee[];
  customerTypes: PricingCustomerType[];
  customerTypePromos: Record<string, string[]>;
  depositPromoEnabled: boolean;
  withFuelSwap: boolean;
  depositLink: string;
  bannerContent: string;
  guideContent: string;
};

export type PricingSelection = {
  modelId: string;
  versionId: string;
  colorId: string;
  customerTypeId: string;
  vinClubTierId: string | null;
  region: 'hnhcm' | 'other';
  selectedPromotionIds: string[];
  selectedOptionalFeeIds: string[];
};

export type QuoteLine = {
  label: string;
  amount: number;
  kind: 'charge' | 'discount' | 'info';
  detail?: string;
};

export type PricingQuote = {
  model: PricingModel;
  version: PricingVersion;
  color: PricingColor | null;
  customerType: PricingCustomerType;
  vinClubTier: PricingVinClubTier | null;
  selectedPromotions: Array<PricingPromotion | PricingSyntheticPromotion>;
  selectedOptionalFees: PricingOptionalFee[];
  basePrice: number;
  colorSurcharge: number;
  promotionDiscountTotal: number;
  vinClubDiscount: number;
  feeTotal: number;
  optionalFeeTotal: number;
  total: number;
  depositAmount: number;
  lines: QuoteLine[];
  promotionAmounts: Record<string, number>;
  optionalFeeAmounts: Record<string, number>;
};

type PricingSyntheticPromotion = PricingPromotion & {
  synthetic: true;
};

function extractJsonPayload(text: string) {
  const markerIndex = text.indexOf(RAW_MARKER);
  if (markerIndex === -1) {
    throw new Error('Không tìm thấy khối JSON giá xe trong file nguồn.');
  }

  const jsonStart = text.indexOf('{', markerIndex);
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error('Khối dữ liệu giá xe không hợp lệ.');
  }

  return text.slice(jsonStart, jsonEnd + 1);
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '[]') return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
      }
    } catch {
      return trimmed ? [trimmed] : [];
    }
  }

  return [];
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toNullableNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toRecordNumber(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, toNumber(entry)])
  );
}

const PRICING_CONFIG_STORAGE_KEY = 'vf_pricing_config_v1';

function normalizeJsonDataset(parsed: any): PricingDataset {
  const models = Array.isArray(parsed.models)
    ? parsed.models.map((model: any) => ({
        id: String(model.id || ''),
        name: String(model.name || ''),
        image: String(model.image || ''),
        brochure_url: String(model.brochure_url || '')
      }))
    : [];

  const versions = Array.isArray(parsed.versions)
    ? parsed.versions.map((version: any) => ({
        id: String(version.id || ''),
        modelId: String(version.modelId || ''),
        name: String(version.name || ''),
        basePrice: toNumber(version.basePrice),
        specificPromotions: toRecordNumber(version.specificPromotions),
        advancedColorPrice: toNullableNumber(version.advancedColorPrice),
        depositDiscount: toNullableNumber(version.depositDiscount),
        bodyInsuranceAmount: toNullableNumber(version.bodyInsuranceAmount),
        depositAmount: toNumber(version.depositAmount),
        colors: Array.isArray(version.colors)
          ? version.colors.map((color: any) => ({
              id: String(color.id || ''),
              name: String(color.name || ''),
              image: String(color.image || ''),
              color_code: String(color.color_code || ''),
              is_advanced: Boolean(color.is_advanced)
            }))
          : [],
        promoFlags: typeof version.promoFlags === 'object' && version.promoFlags && !Array.isArray(version.promoFlags)
          ? Object.fromEntries(Object.entries(version.promoFlags).map(([key, entry]) => [key, Boolean(entry)]))
          : {}
      }))
    : [];

  const promotions = Array.isArray(parsed.promotions)
    ? parsed.promotions.map((promotion: any) => ({
        id: String(promotion.id || ''),
        name: String(promotion.name || ''),
        type: promotion.type === 'percentage' ? 'percentage' : 'fixed',
        value: toNumber(promotion.value),
        useSpecificValue: Boolean(promotion.useSpecificValue),
        incompatibleWith: toStringArray(promotion.incompatibleWith),
        applicableTo: toStringArray(promotion.applicableTo),
        calculationBase: promotion.calculationBase === 'discounted_price' ? 'discounted_price' : 'list_price',
        isFuelSwap: Boolean(promotion.isFuelSwap),
        versionOverrides: toRecordNumber(promotion.versionOverrides)
      }))
    : [];

  const fees = Array.isArray(parsed.fees)
    ? parsed.fees.map((fee: any) => ({
        id: String(fee.id || ''),
        name: String(fee.name || ''),
        amountHnHcm: toNumber(fee.amountHnHcm),
        amountOther: toNumber(fee.amountOther)
      }))
    : [];

  const vinClubTiers = Array.isArray(parsed.vinClubTiers)
    ? parsed.vinClubTiers.map((tier: any) => ({
        id: String(tier.id || ''),
        name: String(tier.name || ''),
        discountPercentage: toNumber(tier.discountPercentage)
      }))
    : [];

  const optionalFees = Array.isArray(parsed.optionalFees)
    ? parsed.optionalFees.map((fee: any) => ({
        id: String(fee.id || ''),
        name: String(fee.name || ''),
        defaultAmount: toNumber(fee.defaultAmount)
      }))
    : [];

  const customerTypes = Array.isArray(parsed.customerTypes)
    ? parsed.customerTypes.map((customerType: any) => ({
        id: String(customerType.id || ''),
        name: String(customerType.name || ''),
        emoji: String(customerType.emoji || ''),
        description: String(customerType.description || ''),
        allowsDeposit: Boolean(customerType.allowsDeposit),
        allowsVinclub: Boolean(customerType.allowsVinclub)
      }))
    : [];

  return {
    models,
    versions,
    promotions,
    fees,
    vinClubTiers,
    optionalFees,
    customerTypes,
    customerTypePromos:
      typeof parsed.customerTypePromos === 'object' && parsed.customerTypePromos && !Array.isArray(parsed.customerTypePromos)
        ? Object.fromEntries(
            Object.entries(parsed.customerTypePromos).map(([key, value]) => [key, toStringArray(value)])
          )
        : {},
    depositPromoEnabled: Boolean(parsed.depositPromoEnabled),
    withFuelSwap: Boolean(parsed.withFuelSwap),
    depositLink: String(parsed.depositLink || ''),
    bannerContent: String(parsed.bannerContent || ''),
    guideContent: sanitizeGuideContent(String(parsed.guideContent || ''))
  };
}

function getDefaultPricingDataset() {
  return normalizeJsonDataset(JSON.parse(extractJsonPayload(String(pricingRawText))));
}

export const defaultPricingDataset = getDefaultPricingDataset();

export function loadPricingDataset() {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem(PRICING_CONFIG_STORAGE_KEY);
    if (raw) {
      try {
        return normalizeJsonDataset(JSON.parse(raw));
      } catch {
        window.localStorage.removeItem(PRICING_CONFIG_STORAGE_KEY);
      }
    }
  }

  return defaultPricingDataset;
}

export function savePricingDatasetConfig(dataset: PricingDataset) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PRICING_CONFIG_STORAGE_KEY, JSON.stringify(dataset));
}

export function clearPricingDatasetConfig() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PRICING_CONFIG_STORAGE_KEY);
}

export const pricingDataset = loadPricingDataset();

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

export function getModelById(modelId: string) {
  return pricingDataset.models.find((model) => model.id === modelId) || pricingDataset.models[0] || null;
}

export function getVersionById(versionId: string) {
  return pricingDataset.versions.find((version) => version.id === versionId) || null;
}

export function getCustomerTypeById(customerTypeId: string) {
  return pricingDataset.customerTypes.find((customerType) => customerType.id === customerTypeId) || pricingDataset.customerTypes[0] || null;
}

export function getVinClubTierById(tierId: string | null) {
  if (!tierId) return null;
  return pricingDataset.vinClubTiers.find((tier) => tier.id === tierId) || null;
}

export function getColorById(version: PricingVersion, colorId: string) {
  return version.colors.find((color) => color.id === colorId) || version.colors[0] || null;
}

export function getVersionsForModel(modelId: string) {
  return pricingDataset.versions.filter((version) => version.modelId === modelId);
}

function isPromotionApplicable(promotion: PricingPromotion, versionId: string) {
  return promotion.applicableTo.length === 0 || promotion.applicableTo.includes(versionId);
}

function isO2ORelatedPromotion(promotion: PricingPromotion) {
  return promotion.name.toLowerCase().includes('o2o');
}

function sanitizeGuideContent(content: string) {
  return content
    .split('\n')
    .filter((line) => !line.toLowerCase().includes('o2o'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function getAvailablePromotions(version: PricingVersion, customerType: PricingCustomerType) {
  const basePromotions = pricingDataset.promotions.filter(
    (promotion) => isPromotionApplicable(promotion, version.id) && !isO2ORelatedPromotion(promotion)
  );
  return basePromotions;
}

export function getDefaultPromotionIds(version: PricingVersion, customerType: PricingCustomerType) {
  const availablePromotions = getAvailablePromotions(version, customerType);
  const availableIds = new Set(availablePromotions.map((promotion) => promotion.id));
  return (pricingDataset.customerTypePromos[customerType.id] || []).filter((promotionId) => availableIds.has(promotionId));
}

function getPromotionAmount(
  promotion: PricingPromotion | PricingSyntheticPromotion,
  version: PricingVersion,
  vehicleBase: number,
  currentSubtotal: number
) {
  if (promotion.type === 'percentage') {
    const referenceAmount = promotion.calculationBase === 'discounted_price' ? currentSubtotal : vehicleBase;
    return Math.round((referenceAmount * promotion.value) / 100);
  }

  const overrideAmount = promotion.versionOverrides[version.id];
  if (typeof overrideAmount === 'number') {
    return overrideAmount;
  }

  if (promotion.synthetic) {
    return promotion.value;
  }

  return promotion.useSpecificValue ? promotion.value : promotion.value;
}

function getFeeAmount(fee: PricingFee, region: 'hnhcm' | 'other') {
  return region === 'hnhcm' ? fee.amountHnHcm : fee.amountOther;
}

function resolveSelectedPromotions(
  version: PricingVersion,
  customerType: PricingCustomerType,
  selectedPromotionIds: string[]
) {
  const availablePromotions = getAvailablePromotions(version, customerType);
  const availableMap = new Map(availablePromotions.map((promotion) => [promotion.id, promotion]));
  const selectedSet = new Set(selectedPromotionIds.filter((promotionId) => availableMap.has(promotionId)));

  return availablePromotions.filter((promotion) => selectedSet.has(promotion.id));
}

export function computePricingQuote(selection: PricingSelection) {
  const model = getModelById(selection.modelId);
  const version = getVersionById(selection.versionId);
  const customerType = getCustomerTypeById(selection.customerTypeId);

  if (!model || !version || !customerType) {
    throw new Error('Thiếu dữ liệu để tính giá.');
  }

  const color = getColorById(version, selection.colorId);
  const selectedPromotions = resolveSelectedPromotions(version, customerType, selection.selectedPromotionIds);
  const vinClubTier = customerType.allowsVinclub && !selectedPromotions.some((promotion) => promotion.id === 'p4')
    ? getVinClubTierById(selection.vinClubTierId)
    : null;
  const availablePromotionMap = new Map(
    getAvailablePromotions(version, customerType).map((promotion) => [promotion.id, promotion])
  );

  let runningSubtotal = version.basePrice + (color?.is_advanced ? version.advancedColorPrice || 0 : 0);
  const lines: QuoteLine[] = [
    { label: `Giá niêm yết ${version.name}`, amount: version.basePrice, kind: 'charge' }
  ];
  const promotionAmounts: Record<string, number> = {};
  const optionalFeeAmounts: Record<string, number> = {};
  let promotionDiscountTotal = 0;

  if (color?.is_advanced && (version.advancedColorPrice || 0) > 0) {
    lines.push({
      label: `Phí màu nâng cao ${color.name}`,
      amount: version.advancedColorPrice || 0,
      kind: 'charge'
    });
  }

  for (const promotion of selectedPromotions) {
    const resolvedPromotion = availablePromotionMap.get(promotion.id) || promotion;
    const amount = getPromotionAmount(resolvedPromotion, version, version.basePrice, runningSubtotal);
    promotionAmounts[promotion.id] = amount;
    promotionDiscountTotal += amount;
    runningSubtotal -= amount;
    lines.push({
      label: promotion.name,
      amount,
      kind: 'discount',
    });
  }

  const vinClubDiscount = vinClubTier ? Math.round((runningSubtotal * vinClubTier.discountPercentage) / 100) : 0;
  if (vinClubDiscount > 0 && vinClubTier) {
    runningSubtotal -= vinClubDiscount;
    lines.push({
      label: `VinClub ${vinClubTier.name}`,
      amount: vinClubDiscount,
      kind: 'discount'
    });
  }

  const feeTotal = pricingDataset.fees.reduce((sum, fee) => {
    const amount = getFeeAmount(fee, selection.region);
    lines.push({
      label: fee.name,
      amount,
      kind: 'charge'
    });
    return sum + amount;
  }, 0);

  const selectedOptionalFees = pricingDataset.optionalFees.filter((fee) => selection.selectedOptionalFeeIds.includes(fee.id));
  const optionalFeeTotal = selectedOptionalFees.reduce((sum, fee) => {
    optionalFeeAmounts[fee.id] = fee.defaultAmount;
    lines.push({
      label: fee.name,
      amount: fee.defaultAmount,
      kind: 'charge'
    });
    return sum + fee.defaultAmount;
  }, 0);

  const total = runningSubtotal + feeTotal + optionalFeeTotal;

  if (version.depositAmount > 0) {
    lines.push({
      label: 'Tiền đặt cọc dự kiến',
      amount: version.depositAmount,
      kind: 'info'
    });
  }

  return {
    model,
    version,
    color,
    customerType,
    vinClubTier,
    selectedPromotions,
    selectedOptionalFees,
    basePrice: version.basePrice,
    colorSurcharge: color?.is_advanced ? version.advancedColorPrice || 0 : 0,
    promotionDiscountTotal,
    vinClubDiscount,
    feeTotal,
    optionalFeeTotal,
    total,
    depositAmount: version.depositAmount,
    lines,
    promotionAmounts,
    optionalFeeAmounts
  } satisfies PricingQuote;
}
