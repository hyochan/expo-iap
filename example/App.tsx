import {
  endConnection,
  getProducts,
  initConnection,
  isProductAndroid,
  isProductIos,
} from "expo-iap";
import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Product } from "../src/ExpoIap.types";

const productSkus = ["com.cooni.point1000", "com.cooni.point5000"];

const operations = ["initConnection", "getProducts", "endConnection"];
type Operation = (typeof operations)[number];

export default function App() {
  const [items, setItems] = useState<Product[]>([]);

  const handleOperation = async (operation: Operation) => {
    if (operation === "initConnection") {
      console.log("Connected", await initConnection());
      return;
    }

    if (operation === "endConnection") {
      const result = await endConnection();

      if (result) {
        setItems([]);
      }
    }

    if (operation === "getProducts") {
      try {
        const products = await getProducts(productSkus);
        console.log("items", products);
        setItems(products);
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Expo IAP Example</Text>
      <View style={styles.buttons}>
        <ScrollView contentContainerStyle={styles.buttonsWrapper} horizontal>
          {operations.map((operation) => (
            <Pressable
              key={operation}
              onPress={() => handleOperation(operation)}
            >
              <View style={styles.buttonView}>
                <Text>{operation}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.content}>
        {items.map((item) => {
          if (isProductAndroid(item)) {
            return (
              <Text key={item.title}>
                {item.title} -{" "}
                {item.oneTimePurchaseOfferDetails?.formattedPrice}
              </Text>
            );
          }

          if (isProductIos(item)) {
            return (
              <Text key={item.id}>
                {item.displayName} - {item.displayPrice}
              </Text>
            );
          }
        })}
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
  buttons: {
    height: 90,
  },
  buttonsWrapper: {
    padding: 24,

    gap: 8,
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
