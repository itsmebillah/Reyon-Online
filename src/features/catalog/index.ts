import { businessConfig } from "@/config/business";
import { catalogRepository } from "./data/in-memory-catalog-repository";
import type { Money } from "./domain/catalog";

export type {
  CatalogProduct,
  CatalogQuery,
  CatalogSort,
} from "./domain/catalog";
export {
  canTransitionCatalogStatus,
  catalogStatuses,
  catalogVariantTypes,
  getPrimaryImage,
  getProductBusinessReference,
  isCustomerVisibleCatalogStatus,
  validateCatalogProduct,
} from "./domain/catalog-administration";
export type {
  CatalogAdminProduct,
  CatalogAdminVariant,
  CatalogPrice,
  CatalogPriceType,
  CatalogSkuSource,
  CatalogStatus,
  CatalogValidationIssue,
  CatalogVariantType,
} from "./domain/catalog-administration";
export { catalogRepository };

export const formatMoney = (money: Money) =>
  new Intl.NumberFormat(businessConfig.locale, {
    style: "currency",
    currency: money.currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(money.amount);
