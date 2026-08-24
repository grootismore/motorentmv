// Runs before the test framework is installed. jest-expo's preset already
// mocks most native modules; add project-wide test setup here as it's
// needed (e.g. env var defaults, global mocks) rather than per-file.

import { notifyManager } from '@tanstack/react-query';

// Every @expo/ui *view* (Host, Button, TextInput, FieldGroup, ...) renders
// fine under Jest via React Native's own generic native-view-manager mock
// (jest-expo's preset) -- nothing to add for those. `useNativeState`,
// though, isn't a view: it constructs a real native module object
// (`requireNativeModule('ExpoUI').ObservableState`, a SharedObject),
// which that generic mock doesn't cover at all, so it throws
// ("ExpoUI.ObservableState is not a constructor") the moment any
// @expo/ui component that manages native state mounts in a test --
// including @expo/ui's own TextInput internals (it keeps its own
// ObservableState for the field's value even when we pass one in), not
// just our direct useNativeState() calls, which is why mocking
// useNativeState itself at the '@expo/ui' package-export level doesn't
// reach it: this mocks one level lower, the native module lookup every
// one of those call sites shares.
jest.mock('expo', () => {
  const actual = jest.requireActual('expo');
  return {
    ...actual,
    requireNativeModule: (name: string) => {
      if (name !== 'ExpoUI') return actual.requireNativeModule(name);
      class ObservableState {
        private _value: unknown;
        constructor({ value }: { value: unknown }) {
          this._value = value;
        }
        getValue() {
          return this._value;
        }
        setValue({ value }: { value: unknown }) {
          this._value = value;
        }
        setOnChange() {}
        release() {}
      }
      class WorkletCallback {}
      return { ObservableState, WorkletCallback };
    },
  };
});

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
