import { renderHook, act } from '@testing-library/react';

// The `supported` constant in useNotifications.js is evaluated at module-load
// time via `'Notification' in window`. jsdom doesn't include Notification by
// default, so we must stub the global BEFORE importing the module, and use
// vi.resetModules() to force a fresh import each test run.

const mockRequestPermission = vi.fn();
const MockNotification = vi.fn();
MockNotification.permission = 'default';
MockNotification.requestPermission = mockRequestPermission;

let useNotifications;

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('Notification', MockNotification);
  MockNotification.permission = 'default';
  mockRequestPermission.mockResolvedValue('granted');
  // Dynamic import after stubbing so `supported` evaluates to true
  const mod = await import('../useNotifications.js');
  useNotifications = mod.useNotifications;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// --- Test 1: requestPermission called on mount when permission is 'default' ---
test('requestPermission is called on mount when permission is default', () => {
  MockNotification.permission = 'default';
  renderHook(() => useNotifications());
  expect(mockRequestPermission).toHaveBeenCalledOnce();
});

// --- Test 2: requestPermission NOT called when permission is already 'granted' ---
test('requestPermission is NOT called when permission is already granted', () => {
  MockNotification.permission = 'granted';
  renderHook(() => useNotifications());
  expect(mockRequestPermission).not.toHaveBeenCalled();
});

// --- Test 3: notify() fires new Notification when tab is backgrounded and permission granted ---
test('notify() fires a Notification when tab is hidden and permission is granted', () => {
  MockNotification.permission = 'granted';
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'hidden',
  });

  const { result } = renderHook(() => useNotifications());
  act(() => {
    result.current.notify('hello');
  });

  expect(MockNotification).toHaveBeenCalledWith('Nexus', { body: 'hello' });
});

// --- Test 4: notify() suppressed when tab is in foreground ---
test('notify() does NOT fire a Notification when tab is visible', () => {
  MockNotification.permission = 'granted';
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'visible',
  });

  const { result } = renderHook(() => useNotifications());
  act(() => {
    result.current.notify('hello');
  });

  expect(MockNotification).not.toHaveBeenCalled();
});

// --- Test 5: notify() suppressed when permission is not granted ---
test('notify() does NOT fire a Notification when permission is denied', () => {
  MockNotification.permission = 'denied';
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'hidden',
  });

  const { result } = renderHook(() => useNotifications());
  act(() => {
    result.current.notify('hello');
  });

  expect(MockNotification).not.toHaveBeenCalled();
});
