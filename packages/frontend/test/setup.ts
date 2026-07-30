import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			if (value === undefined || value === null) {
				store[key] = String(value);
			} else {
				store[key] = value.toString();
			}
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		}
	};
})();

// Mock console methods
global.console = {
	...console,
	log: vi.fn(),
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock
});

// Svelte plays a transition through the Web Animations API, which happy-dom does not
// implement — so mounting a component that slides in dies on `element.animate` before
// any of it can be asserted. The animation itself is not what a test is about, so the
// stub does nothing and reports itself finished.
if (!Element.prototype.animate) {
	Element.prototype.animate = () =>
		({
			cancel: () => {},
			finish: () => {},
			currentTime: 0,
			playState: 'finished',
			startTime: 0,
			addEventListener: () => {},
			removeEventListener: () => {}
		}) as unknown as Animation;
}

// Clear mocks and localStorage before each test
beforeEach(() => {
	localStorage.clear();
	vi.clearAllMocks();
});
