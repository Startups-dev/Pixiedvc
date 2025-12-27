import '@testing-library/jest-dom/vitest';

const originalLocation = window.location;

beforeAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...originalLocation,
      assign: vi.fn(),
      replace: vi.fn(),
      href: originalLocation.href,
    },
  });
});

afterAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  });
});
