// Jest setup file
// Mock localStorage for Node.js environment

console.log('jest.setup.ts running...');

// Create a mock localStorage implementation
const createMockLocalStorage = (): Storage => {
  let store: Record<string, string> = {};
  
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear: () => { store = {}; },
    getItem: (key: string) => store[key] || null,
    key: (index: number) => Object.keys(store)[index] || null,
    removeItem: (key: string) => { delete store[key]; },
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
  };
};

// Set up localStorage as a global variable for Node.js environment
(global as any).localStorage = createMockLocalStorage();

// Also set up window.localStorage for browser-like environment
const mockWindow = {
  dispatchEvent: jest.fn(),
  localStorage: (global as any).localStorage,
};

(global as any).window = mockWindow;
Object.defineProperty(window, 'localStorage', {
  value: (global as any).localStorage,
  writable: true,
});

console.log('localStorage mock set up');
