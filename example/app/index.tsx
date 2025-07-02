import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {Link} from 'expo-router';

/**
 * Example App Landing Page
 *
 * Navigation to focused purchase flow implementations.
 * This demonstrates TypeScript-first, platform-agnostic approaches to in-app purchases.
 */
export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>expo-iap Examples</Text>
      <Text style={styles.subtitle}>Best Practice Implementations</Text>

      <Text style={styles.description}>
        These examples demonstrate TypeScript-first approaches to in-app
        purchases with:
        {'\n'}• Automatic type inference (no manual casting)
        {'\n'}• Platform-agnostic property access
        {'\n'}• Clean error handling with proper types
        {'\n'}• Focused implementations for each use case
        {'\n'}• CPK React Native compliant code style
      </Text>

      <View style={styles.buttonContainer}>
        <Link href="/purchase-flow" asChild>
          <TouchableOpacity style={[styles.button, styles.primaryButton]}>
            <Text style={styles.buttonText}>🛒 In-App Purchase Flow</Text>
            <Text style={styles.buttonSubtext}>One-time products</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/subscription-flow" asChild>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.buttonText}>🔄 Subscription Flow</Text>
            <Text style={styles.buttonSubtext}>Recurring subscriptions</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonSubtext: {
    color: 'gray',
    fontSize: 14,
  },
});
