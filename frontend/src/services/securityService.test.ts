describe('Security Service Encryption', () => {
  const originalEnv = process.env;
  let encryptData: any;
  let decryptData: any;

  beforeEach(async () => {
    jest.resetModules(); // clears the cache
    process.env = { ...originalEnv, ENCRYPTION_KEY: 'test_key_for_jest' };

    // Dynamically import after setting env var
    const mod = await import('./securityService');
    encryptData = mod.encryptData;
    decryptData = mod.decryptData;
  });

  afterAll(() => {
    process.env = originalEnv; // restore original env
  });

  it('should throw an error if ENCRYPTION_KEY is missing', async () => {
    jest.resetModules();
    delete process.env.ENCRYPTION_KEY;

    await expect(import('./securityService')).rejects.toThrow("CRITICAL SECURITY ERROR: ENCRYPTION_KEY environment variable is not set. Cannot start securely.");
  });

  it('should encrypt and decrypt string data correctly', () => {
    const testData = 'sensitive information';
    const encrypted = encryptData(testData);

    expect(encrypted).not.toEqual(testData);

    const decrypted = decryptData(encrypted);
    expect(decrypted).toEqual(testData);
  });

  it('should encrypt and decrypt object data correctly', () => {
    const testData = { user: 'test', role: 'admin' };
    const encrypted = encryptData(testData);

    expect(encrypted).not.toContain('test');
    expect(encrypted).not.toContain('admin');
  });

  const testData = { foo: 'bar', baz: 123 };

  test('should encrypt and decrypt data correctly', () => {
    const encrypted = encryptData(testData);
    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(JSON.stringify(testData));

    const decrypted = decryptData(encrypted);
    expect(decrypted).toEqual(testData);
  });

  it('should handle decrypting invalid data gracefully', () => {
      // Test the legacy fallback behavior
      const testData = { user: 'legacy' };
      const rawString = JSON.stringify(testData);

      const decrypted = decryptData(rawString);
      expect(decrypted).toEqual(testData);
  });

  it('should return null for invalid encrypted data that is not valid json', () => {
      const decrypted = decryptData("not-valid-base64-or-json");
      expect(decrypted).toBeNull();
  });

  test('should return null for invalid ciphertext', () => {
    expect(decryptData(null)).toBeNull();
    expect(decryptData('')).toBeNull();
  });

  test('should handle legacy unencrypted data', () => {
    const json = JSON.stringify(testData);
    const decrypted = decryptData(json);
    expect(decrypted).toEqual(testData);
  });
});
