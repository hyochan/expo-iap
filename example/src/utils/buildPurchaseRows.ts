import type {Purchase, PurchaseIOS, PurchaseAndroid} from '../../src/types';

export type PurchaseDetailRow = {
  label: string;
  value: string;
};

const formatBoolean = (value?: boolean | null): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return value ? 'Yes' : 'No';
};

const formatDate = (timestamp?: number | null): string | undefined => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return undefined;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toLocaleString();
};

const formatList = (
  value?: Array<string | number | null> | null,
): string | undefined => {
  if (!value || value.length === 0) {
    return undefined;
  }
  return value
    .filter(
      (item) => item !== null && item !== undefined && `${item}`.length > 0,
    )
    .map((item) => `${item}`)
    .join(', ');
};

const pushRow = (
  rows: PurchaseDetailRow[],
  label: string,
  value?: string | undefined,
) => {
  if (value === undefined || value === null) {
    return;
  }
  if (`${value}`.length === 0) {
    return;
  }
  rows.push({label, value: `${value}`});
};

export const buildPurchaseRows = (purchase: Purchase): PurchaseDetailRow[] => {
  const rows: PurchaseDetailRow[] = [];

  pushRow(rows, 'Product ID', purchase.productId);
  pushRow(rows, 'Transaction ID', purchase.id);
  pushRow(rows, 'Platform', purchase.platform ?? 'unknown');
  pushRow(rows, 'Purchase State', purchase.purchaseState);
  pushRow(rows, 'Quantity', purchase.quantity?.toString());
  pushRow(rows, 'Auto Renewing', formatBoolean(purchase.isAutoRenewing));
  pushRow(rows, 'Associated IDs', formatList(purchase.ids ?? undefined));
  pushRow(rows, 'Purchase Token', purchase.purchaseToken);
  pushRow(rows, 'Transaction Date', formatDate(purchase.transactionDate));

  const platform = (purchase.platform ?? '').toString().toLowerCase();

  if (platform === 'ios') {
    const iosPurchase = purchase as PurchaseIOS;
    pushRow(rows, 'Quantity (iOS)', iosPurchase.quantityIOS?.toString());
    pushRow(rows, 'Environment', iosPurchase.environmentIOS);
    pushRow(rows, 'Expiration Date', formatDate(iosPurchase.expirationDateIOS));
    pushRow(
      rows,
      'Original Transaction ID',
      iosPurchase.originalTransactionIdentifierIOS,
    );
    pushRow(
      rows,
      'Original Transaction Date',
      formatDate(iosPurchase.originalTransactionDateIOS),
    );
    pushRow(rows, 'App Account Token', iosPurchase.appAccountToken);
    pushRow(rows, 'Storefront Country', iosPurchase.storefrontCountryCodeIOS);
    pushRow(rows, 'Country Code', iosPurchase.countryCodeIOS);
    pushRow(rows, 'Currency Code', iosPurchase.currencyCodeIOS);
    pushRow(rows, 'Currency Symbol', iosPurchase.currencySymbolIOS);
    pushRow(rows, 'Subscription Group ID', iosPurchase.subscriptionGroupIdIOS);
    pushRow(rows, 'Is Upgraded', formatBoolean(iosPurchase.isUpgradedIOS));
    pushRow(rows, 'Ownership Type', iosPurchase.ownershipTypeIOS);
    pushRow(rows, 'Reason', iosPurchase.reasonIOS);
    pushRow(rows, 'Reason (String)', iosPurchase.reasonStringRepresentationIOS);
    pushRow(rows, 'Transaction Reason', iosPurchase.transactionReasonIOS);
    pushRow(rows, 'Revocation Date', formatDate(iosPurchase.revocationDateIOS));
    pushRow(rows, 'Revocation Reason', iosPurchase.revocationReasonIOS);
    pushRow(
      rows,
      'Web Order Line Item ID',
      iosPurchase.webOrderLineItemIdIOS?.toString(),
    );
    if (iosPurchase.offerIOS) {
      pushRow(rows, 'Offer ID', iosPurchase.offerIOS.id);
      pushRow(rows, 'Offer Type', iosPurchase.offerIOS.type);
      pushRow(rows, 'Offer Payment Mode', iosPurchase.offerIOS.paymentMode);
    }
  } else if (platform === 'android') {
    const androidPurchase = purchase as PurchaseAndroid;
    pushRow(rows, 'Google Transaction ID', androidPurchase.transactionId);
    pushRow(rows, 'Signature', androidPurchase.signatureAndroid);
    pushRow(rows, 'Package Name', androidPurchase.packageNameAndroid);
    pushRow(rows, 'Developer Payload', androidPurchase.developerPayloadAndroid);
    pushRow(
      rows,
      'Obfuscated Account ID',
      androidPurchase.obfuscatedAccountIdAndroid,
    );
    pushRow(
      rows,
      'Obfuscated Profile ID',
      androidPurchase.obfuscatedProfileIdAndroid,
    );
    pushRow(
      rows,
      'Is Acknowledged',
      formatBoolean(androidPurchase.isAcknowledgedAndroid),
    );
    pushRow(
      rows,
      'Auto Renewing (Android)',
      formatBoolean(androidPurchase.autoRenewingAndroid),
    );
    pushRow(rows, 'Purchase Data', androidPurchase.dataAndroid);
  }

  return rows;
};
