import { StyleSheet, Text, View } from 'react-native';

import * as ExpoIap from 'expo-iap';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>{ExpoIap.hello()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
