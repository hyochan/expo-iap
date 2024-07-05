// Import the native module. On web, it will be resolved to ExpoIap.web.ts
// and on native platforms to ExpoIap.ts
import {
  NativeModulesProxy,
  EventEmitter,
  Subscription,
} from "expo-modules-core";
import { Platform } from "react-native";

import { ChangeEventPayload, Product } from "./ExpoIap.types";
import ExpoIapModule from "./ExpoIapModule";

// Get the native constant value.
export const PI = ExpoIapModule.PI;

export async function setValueAsync(value: string) {
  return await ExpoIapModule.setValueAsync(value);
}

const emitter = new EventEmitter(ExpoIapModule ?? NativeModulesProxy.ExpoIap);

export function addChangeListener(
  listener: (event: ChangeEventPayload) => void,
): Subscription {
  return emitter.addListener<ChangeEventPayload>("onChange", listener);
}

export { ChangeEventPayload };

export function initConnection() {
  return ExpoIapModule.initConnection();
}

export const getProducts = async (skus: string[]): Promise<Product[]> => {
  if (!skus?.length) {
    return Promise.reject(new Error('"skus" is required'));
  }

  return Platform.select({
    ios: async () => {
      const items = (await ExpoIapModule.getItems(skus)) as Product[];
      return items.filter((item: Product) => skus.includes(item.id));
    },
    android: async () => {
      const products = await ExpoIapModule.getItemsByType("inapp", skus);

      return products;
    },
    default: () => Promise.reject(new Error("Unsupported Platform")),
  })();
};

export async function endConnection(): Promise<boolean> {
  return ExpoIapModule.endConnection();
}
