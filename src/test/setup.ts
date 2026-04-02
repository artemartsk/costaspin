import '@testing-library/jest-dom';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { beforeAll, afterEach, afterAll } from 'vitest';

export const server = setupServer(...handlers);

if (typeof window.HTMLElement.prototype.hasPointerCapture !== 'function') {
    window.HTMLElement.prototype.hasPointerCapture = () => false;
}
if (typeof window.HTMLElement.prototype.setPointerCapture !== 'function') {
    window.HTMLElement.prototype.setPointerCapture = () => {};
}
if (typeof window.HTMLElement.prototype.releasePointerCapture !== 'function') {
    window.HTMLElement.prototype.releasePointerCapture = () => {};
}
if (typeof window.HTMLElement.prototype.scrollIntoView !== 'function') {
    window.HTMLElement.prototype.scrollIntoView = () => {};
}

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
