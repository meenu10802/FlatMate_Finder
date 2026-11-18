/**
 * Accessibility audit: renders real pages (API + socket mocked) and runs axe-core on each.
 * Colour contrast is excluded (jsdom has no layout/colour engine) — ratios were measured separately (CLAUDE.md §6).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'axe-core';

/* ── Mocks ───────────────────────────────────────────────────── */

let loggedIn = false;

const ME = { id: 1, email: 'asha@example.com', name: 'Asha Test', hasProfile: true };
const PROFILE = {
  userId: 1, name: 'Asha Test', age: 27, occupation: 'Designer', bio: 'Tidy, quiet, loves plants.', gender: null,
  avatarUrl: null, hasRoom: false, roomPhotoUrl: null, city: { id: 1, name: 'Chennai' }, area: { id: 1, name: 'Adyar' },
  searchRadiusKm: 5, smoking: 'no', pets: 'flexible', parties: 'occasionally', cleanliness: 4,
  budgetMin: 15000, budgetMax: 24000, moveInDate: '2026-12-01', isActive: true,
};
const BREAKDOWN = ['budget', 'smoking', 'pets', 'parties', 'cleanliness', 'moveIn', 'location'].map((factor, i) => ({
  factor, label: factor, score: [1, 0.6, 0.2][i % 3], weight: 10, points: 5, status: ['match', 'partial', 'conflict'][i % 3], detail: `${factor} detail`,
}));
const FLATMATE = { ...PROFILE, userId: 2, name: 'Ben Rao', distanceKm: 2.1, score: 74, breakdown: BREAKDOWN };

const ROUTES = {
  '/auth/me': () => (loggedIn ? { user: ME } : Promise.reject(Object.assign(new Error('Please log in'), { status: 401 }))),
  '/profiles/me': () => ({ profile: PROFILE }),
  '/profiles/2': () => ({ profile: { ...PROFILE, userId: 2, name: 'Ben Rao' }, match: { score: 74, breakdown: BREAKDOWN } }),
  '/connections/with/2': () => ({ connection: null }),
  '/locations/cities': () => ({ cities: [{ id: 1, name: 'Chennai' }, { id: 2, name: 'Pune' }] }),
  '/locations/cities/1/areas': () => ({ areas: [{ id: 1, cityId: 1, name: 'Adyar' }] }),
  '/flatmates': () => ({ flatmates: [FLATMATE], origin: { type: 'area', name: 'Adyar' }, radiusKm: 5, sort: 'match', total: 1, hasMore: false }),
  '/connections': () => ({
    incoming: [{ id: 9, status: 'pending', direction: 'incoming', user: { id: 3, name: 'Cara Iyer', location: 'Velachery' } }],
    outgoing: [],
    accepted: [{ id: 7, status: 'accepted', direction: 'outgoing', user: { id: 2, name: 'Ben Rao', location: 'Adyar' } }],
  }),
  '/conversations': () => ({
    conversations: [{
      connectionId: 7, connectedAt: '2026-11-18T10:00:00Z', unread: 2,
      user: { id: 2, name: 'Ben Rao', location: 'Adyar', online: true },
      lastMessage: { id: 5, connectionId: 7, senderId: 2, body: 'Still free on Saturday?', createdAt: '2026-11-18T11:00:00Z', readAt: null },
    }],
  }),
  '/conversations/7/messages': () => ({
    hasMore: false,
    messages: [
      { id: 4, connectionId: 7, senderId: 1, body: 'Hi Ben!', createdAt: '2026-11-18T10:30:00Z', readAt: '2026-11-18T10:31:00Z' },
      { id: 5, connectionId: 7, senderId: 2, body: 'Still free on Saturday?', createdAt: '2026-11-18T11:00:00Z', readAt: null },
    ],
  }),
};

vi.mock('../api/client.js', () => ({
  api: {
    get: vi.fn(async (url) => {
      const handler = ROUTES[url];
      if (!handler) throw Object.assign(new Error(`No mock for GET ${url}`), { status: 404 });
      return { data: await handler() };
    }),
    post: vi.fn(async () => ({ data: {} })),
    put: vi.fn(async () => ({ data: {} })),
    patch: vi.fn(async () => ({ data: {} })),
  },
}));

vi.mock('socket.io-client', () => {
  const socket = { on() {}, emit() {}, removeAllListeners() {}, close() {}, connected: false, timeout() { return this; } };
  return { io: () => socket };
});

const { default: App } = await import('../App.jsx');

/* ── Helpers ─────────────────────────────────────────────────── */

function renderAt(path) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function expectNoAxeViolations(container) {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n    ')}`);
  expect(summary, summary.join('\n')).toEqual([]);
}

/* ── Tests ───────────────────────────────────────────────────── */

describe('accessibility (axe)', () => {
  describe('logged out', () => {
    beforeEach(() => { loggedIn = false; });

    it.each([
      ['/', /live with people who/i],
      ['/login', /good to see you/i],
      ['/register', /find your/i],
      ['/does-not-exist', /already taken/i],
    ])('%s', async (path, heading) => {
      const { container } = renderAt(path);
      await screen.findByRole('heading', { level: 1, name: heading });
      await expectNoAxeViolations(container);
    });
  });

  describe('logged in', () => {
    beforeEach(() => { loggedIn = true; });

    it.each([
      ['/browse', 'Ben Rao'],
      ['/me', 'Asha Test'],
      ['/profiles/2', 'How you match'],
      ['/connections', 'Cara Iyer'],
      ['/inbox', 'Pick a conversation'],
      ['/inbox/7', 'Still free on Saturday?'],
      ['/me/edit', 'About you'],
    ])('%s', async (path, text) => {
      const { container } = renderAt(path);
      await screen.findAllByText(text, {}, { timeout: 3000 });
      await expectNoAxeViolations(container);
    });
  });
});

describe('UX checks', () => {
  beforeEach(() => { loggedIn = true; });

  it('page titles are set per route', async () => {
    renderAt('/inbox');
    await screen.findByText('Pick a conversation');
    await waitFor(() => expect(document.title).toBe('(2) Inbox · Flatmate Finder'));
  });

  it('mobile menu opens, lists badges, and closes on Escape', async () => {
    renderAt('/browse');
    const button = await screen.findByRole('button', { name: /open menu, 3 new/i });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const menu = document.getElementById('mobile-menu');
    expect(menu.textContent).toMatch(/Inbox\s*2/);
    expect(menu.textContent).toMatch(/Connections\s*1/);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.getElementById('mobile-menu')).toBeNull();
  });

  it('skip link targets the main content', async () => {
    renderAt('/');
    const skip = await screen.findByRole('link', { name: 'Skip to content' });
    expect(skip.getAttribute('href')).toBe('#content');
    expect(document.getElementById('content')).not.toBeNull();
  });

  it('score ring has an accessible name', async () => {
    renderAt('/browse');
    expect(await screen.findByRole('img', { name: 'Match score 74 out of 100' })).toBeTruthy();
  });
});

describe('profile wizard — every step', () => {
  beforeEach(() => { loggedIn = true; });

  it('each of the 4 steps passes axe', async () => {
    const { container } = renderAt('/me/edit');
    for (const step of ['About you', 'Where', 'How you live', 'Budget & timing']) {
      await screen.findByRole('heading', { level: 2, name: step });
      await expectNoAxeViolations(container);
      const next = screen.queryByRole('button', { name: /next/i });
      if (next) fireEvent.click(next);
    }
  });
});
