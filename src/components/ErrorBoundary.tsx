import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';

import { ErrorState } from './states/ErrorState';

interface Props extends PropsWithChildren {
  /** Optional override for the fallback UI. Defaults to <ErrorState />. */
  fallback?: (error: Error, retry: () => void) => ReactNode;
  /** Called with the caught error, e.g. to report to Sentry once wired up. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors below it in the tree. Does not catch errors in
 * event handlers, async code, or server/network errors — those are handled
 * per-screen via ErrorState + the typed API boundary's error shape.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.retry);
      }
      return <ErrorState message={error.message} onRetry={this.retry} />;
    }
    return this.props.children;
  }
}
