import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom doesn't implement these.
window.scrollTo = () => {};
Element.prototype.scrollTo = () => {};

afterEach(() => cleanup());
