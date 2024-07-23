import { ProductAndroid } from "./types/ExpoIapAndroid.types";
import { ProductIos } from "./types/ExpoIapIos.types";
export type ChangeEventPayload = {
  value: string;
};

export type Product = ProductAndroid | ProductIos;
