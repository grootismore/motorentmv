// Runs before the test framework is installed. jest-expo's preset already
// mocks most native modules; add project-wide test setup here as it's
// needed (e.g. env var defaults, global mocks) rather than per-file.

import { notifyManager } from '@tanstack/react-query';

// TanStack Query batches its own re-render notifications via a scheduled
// callback that, in this RN/Jest environment, resolves to a real
// setTimeout(fn, 0) rather than a microtask — a genuine pending timer, not
// just slow. A test that awaits every expected UI change (fireEvent,
// waitFor, findBy*) still finishes before that trailing timer fires (e.g.
// the second notification wave invalidateQueries schedules in a
// mutation's onSuccess), leaving Node's event loop waiting on it and
// hanging the whole `jest`/`npm test` process with no error and no
// indication why. This is TanStack Query's own documented fix for exactly
// this: make the notification and batch-notification callbacks run
// synchronously under test, eliminating the deferred timer entirely
// rather than papering over it with --forceExit or extra waits per test.
notifyManager.setNotifyFunction((fn) => fn());
notifyManager.setBatchNotifyFunction((fn) => fn());
