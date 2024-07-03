export type ChangeEventPayload = {
  value: string;
};

export type Product = {
  debugDescription: string;
  description: string;
  displayName: string;
  displayPrice: string;
  id: string;
  isFamilyShareable: boolean;
  jsonRepresentation: string;
  price: number;
  subscription?: any;
  type: string;
  currency: string;
};
