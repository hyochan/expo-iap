import type {Purchase} from '../types';

const isPurchaseObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

/**
 * Normalizes purchase identifiers so `id` reflects the transaction identifier (if present).
 * Falls back to the existing `id` when no transaction identifier is available.
 */
export const normalizePurchaseId = <T extends Purchase | null | undefined>(
  purchase: T,
): T => {
  if (!isPurchaseObject(purchase)) {
    return purchase;
  }

  const transactionId = (purchase as Record<string, unknown>).transactionId;
  if (typeof transactionId !== 'string' || transactionId.length === 0) {
    return purchase;
  }

  if (purchase.id === transactionId) {
    return purchase;
  }

  return {...purchase, id: transactionId} as T;
};

export const normalizePurchaseList = <T extends Purchase>(
  purchases: T[] | null | undefined,
): T[] => {
  if (!Array.isArray(purchases)) {
    return purchases ?? [];
  }

  if (purchases.length === 0) {
    return purchases;
  }

  return purchases.map((purchase) => normalizePurchaseId(purchase)) as T[];
};

export const normalizePurchasePayload = <T extends Purchase | null | undefined>(
  payload: T | T[] | null | undefined,
): typeof payload => {
  if (Array.isArray(payload)) {
    return payload.map((purchase) =>
      normalizePurchaseId(purchase),
    ) as typeof payload;
  }
  return normalizePurchaseId(payload as T) as typeof payload;
};
