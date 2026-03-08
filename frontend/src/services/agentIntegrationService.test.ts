import { generateAgentCacheKey } from './agentIntegrationService';

describe('generateAgentCacheKey', () => {
  const agentId = 'test-agent';
  const prompt = 'Hello, world!';
  const config = { temperature: 0.7 };

  it('should generate a consistent cache key for the same inputs', () => {
    const key1 = generateAgentCacheKey(agentId, prompt, config);
    const key2 = generateAgentCacheKey(agentId, prompt, config);
    expect(key1).toBe(key2);
    expect(key1).toMatch(/^tp_cache_v1_agentInference_/);
  });

  it('should generate different keys for different agentIds', () => {
    const key1 = generateAgentCacheKey('agent-1', prompt, config);
    const key2 = generateAgentCacheKey('agent-2', prompt, config);
    expect(key1).not.toBe(key2);
  });

  it('should generate different keys for different prompts', () => {
    const key1 = generateAgentCacheKey(agentId, 'prompt 1', config);
    const key2 = generateAgentCacheKey(agentId, 'prompt 2', config);
    expect(key1).not.toBe(key2);
  });

  it('should generate different keys for different configs', () => {
    const key1 = generateAgentCacheKey(agentId, prompt, { temperature: 0.7 });
    const key2 = generateAgentCacheKey(agentId, prompt, { temperature: 0.8 });
    expect(key1).not.toBe(key2);
  });

  it('should handle complex config objects', () => {
    const config1 = { options: { stop: ['\n'], topP: 0.9 } };
    const config2 = { options: { stop: ['\n'], topP: 0.8 } };
    const key1 = generateAgentCacheKey(agentId, prompt, config1);
    const key2 = generateAgentCacheKey(agentId, prompt, config2);
    expect(key1).not.toBe(key2);
  });

  it('should handle null or undefined config', () => {
    const keyNull = generateAgentCacheKey(agentId, prompt, null);
    const keyUndefined = generateAgentCacheKey(agentId, prompt, undefined);

    expect(typeof keyNull).toBe('string');
    expect(typeof keyUndefined).toBe('string');
  });

  it('should include the function name in the cache key', () => {
    const key = generateAgentCacheKey(agentId, prompt, config);
    expect(key).toContain('agentInference');
  });
});
