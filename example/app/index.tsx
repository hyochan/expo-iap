import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, FlatList} from 'react-native';
import {Link} from 'expo-router';
import {getStorefront, ExpoIapConsole} from 'expo-iap';

type MenuItem = {
  id: string;
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  buttonStyle: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'all-products',
    href: '/all-products',
    icon: '📱',
    title: 'All Products',
    subtitle: 'View all items at once',
    buttonStyle: 'allProductsButton',
  },
  {
    id: 'purchase-flow',
    href: '/purchase-flow',
    icon: '🛒',
    title: 'In-App Purchase Flow',
    subtitle: 'One-time products',
    buttonStyle: 'primaryButton',
  },
  {
    id: 'subscription-flow',
    href: '/subscription-flow',
    icon: '🔄',
    title: 'Subscription Flow',
    subtitle: 'Recurring subscriptions',
    buttonStyle: 'secondaryButton',
  },
  {
    id: 'available-purchases',
    href: '/available-purchases',
    icon: '📦',
    title: 'Available Purchases',
    subtitle: 'View past purchases',
    buttonStyle: 'quaternaryButton',
  },
  {
    id: 'offer-code',
    href: '/offer-code',
    icon: '🎁',
    title: 'Offer Code Redemption',
    subtitle: 'Redeem promo codes',
    buttonStyle: 'tertiaryButton',
  },
  {
    id: 'alternative-billing',
    href: '/alternative-billing',
    icon: '🌐',
    title: 'Alternative Billing',
    subtitle: 'External payment links',
    buttonStyle: 'alternativeBillingButton',
  },
];

/**
 * Example App Landing Page
 *
 * Navigation to focused purchase flow implementations.
 * This demonstrates TypeScript-first, platform-agnostic approaches to in-app purchases.
 */
export default function Home() {
  const [storefront, setStorefront] = useState<string | null>(null);

  useEffect(() => {
    getStorefront()
      .then((code) => {
        setStorefront(code);
      })
      .catch((error) => {
        // Silently fail on unsupported platforms
        ExpoIapConsole.log('Storefront not available:', error.message);
      });
  }, []);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>expo-iap Examples</Text>
      <Text style={styles.subtitle}>
        Best Practice Implementations{' '}
        {storefront ? `(Store: ${storefront})` : ''}
      </Text>

      <Text style={styles.description}>
        These examples demonstrate TypeScript-first approaches to in-app
        purchases with:
        {'\n'}• Automatic type inference (no manual casting)
        {'\n'}• Platform-agnostic property access
        {'\n'}• Clean error handling with proper types
        {'\n'}• Focused implementations for each use case
        {'\n'}• CPK React Native compliant code style
      </Text>
    </View>
  );

  const renderItem = ({item}: {item: MenuItem}) => {
    const buttonStyleMap: Record<string, any> = {
      allProductsButton: styles.allProductsButton,
      primaryButton: styles.primaryButton,
      secondaryButton: styles.secondaryButton,
      tertiaryButton: styles.tertiaryButton,
      quaternaryButton: styles.quaternaryButton,
      alternativeBillingButton: styles.alternativeBillingButton,
    };

    return (
      <Link href={item.href as any} asChild>
        <TouchableOpacity
          style={[styles.button, buttonStyleMap[item.buttonStyle]]}
        >
          <Text style={styles.buttonText}>
            {item.icon} {item.title}
          </Text>
          <Text style={styles.buttonSubtext}>{item.subtitle}</Text>
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      data={MENU_ITEMS}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderHeader}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
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
    marginBottom: 16,
  },
  separator: {
    height: 12,
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
  allProductsButton: {
    backgroundColor: '#FF6B6B',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#28a745',
  },
  tertiaryButton: {
    backgroundColor: '#6c757d',
  },
  quaternaryButton: {
    backgroundColor: '#9c27b0',
  },
  alternativeBillingButton: {
    backgroundColor: '#FF9800',
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
