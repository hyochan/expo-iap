import * as ExpoIap from "expo-iap";
import { useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Product } from "../src/ExpoIap.types";

const productSkus = Platform.select({
  ios: ["com.cooni.point1000", "com.cooni.point5000"],

  android: [
    "android.test.purchased",
    "android.test.canceled",
    "android.test.refunded",
    "android.test.item_unavailable",
  ],

  default: [],
}) as string[];

const operations = ["initConnection", "getItems", "endConnection"];
type Operation = (typeof operations)[number];

export default function App() {
  const [items, setItems] = useState<Product[]>([]);

  const handleOperation = async (operation: Operation) => {
    if (operation === "initConnection") {
      console.log("Connected", await ExpoIap.initConnection());
      return;
    }

    if (operation === "endConnection") {
      const result = await ExpoIap.endConnection();

      if (result) {
        setItems([]);
      }
    }

    if (operation === "getItems") {
      try {
        const items = await ExpoIap.getItems(productSkus);
        setItems(items);
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Expo IAP Example</Text>
      <View style={styles.buttonsWrapper}>
        {operations.map((operation) => (
          <Pressable key={operation} onPress={() => handleOperation(operation)}>
            <View style={styles.buttonView}>
              <Text>{operation}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <View style={styles.content}>
        {items.map((item) => (
          <Text key={item.id}>
            {item.displayName} - {item.displayPrice} ({item.currency})
          </Text>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  title: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: "bold",
  },
  buttonsWrapper: {
    padding: 24,
    alignSelf: "stretch",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  buttonView: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#000",
    padding: 8,
  },
  content: {
    flex: 1,
    alignSelf: "stretch",
    padding: 24,
    gap: 12,
  },
});
