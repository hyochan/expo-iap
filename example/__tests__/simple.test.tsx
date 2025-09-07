describe('Simple Tests', () => {
  it('should pass basic math test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should test string operations', () => {
    const text = 'expo-iap';
    expect(text).toContain('iap');
    expect(text.length).toBe(8);
  });

  it('should test array operations', () => {
    const products = ['product1', 'product2', 'product3'];
    expect(products).toHaveLength(3);
    expect(products).toContain('product2');
  });

  it('should test object operations', () => {
    const product = {
      id: 'com.example.product',
      price: 9.99,
      platform: 'ios',
    };
    expect(product.id).toBe('com.example.product');
    expect(product.price).toBeGreaterThan(0);
    expect(product.platform).toMatch(/ios|android/);
  });
});
