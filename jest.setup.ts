/* eslint-disable @typescript-eslint/no-explicit-any */
// Jest setup file
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock Next.js Request/Response for API route tests
if (typeof globalThis.Request === 'undefined') {
  class MockRequest {
    private _url: string;
    method: string;
    headers: any;
    body: any;

    constructor(url: string, init?: any) {
      this._url = url;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
      this.body = init?.body;
    }

    get url() {
      return this._url;
    }

    async json() {
      return JSON.parse(this.body || '{}');
    }
  }

  (globalThis as any).Request = MockRequest;
}

if (typeof globalThis.Response === 'undefined') {
  (globalThis as any).Response = class MockResponse {
    body: any;
    status: number;
    headers: any;

    constructor(body: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }

    async json() {
      return JSON.parse(this.body);
    }

    static json(data: any, init?: any) {
      return new MockResponse(JSON.stringify(data), init);
    }
  };
}
