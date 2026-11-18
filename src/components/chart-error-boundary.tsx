'use client';

import { Component, type ReactNode } from 'react';
import { NoticeBanner } from '@/components/notice-banner';

/** Fallbacks used when the caller passes no text. Plain language, no error details. */
const DEFAULT_MESSAGE =
  'This chart could not be shown. The rest of the page still works.';
const DEFAULT_RETRY_LABEL = 'Try again';

interface ChartErrorBoundaryProps {
  readonly children: ReactNode;
  /** Plain text shown in place of the chart. Never pass an error object. */
  readonly message?: string;
  /** Text of the retry button. */
  readonly retryLabel?: string;
  readonly className?: string;
}

interface ChartErrorBoundaryState {
  readonly hasError: boolean;
}

/**
 * Catches a render error in its chart and shows an error notice in place of
 * that chart only. Shared version of the local boundary in the dev chart page.
 */
export class ChartErrorBoundary extends Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  state: ChartErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  private readonly handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <NoticeBanner
          tone="error"
          message={this.props.message ?? DEFAULT_MESSAGE}
          action={{
            label: this.props.retryLabel ?? DEFAULT_RETRY_LABEL,
            onClick: this.handleRetry,
          }}
          className={this.props.className}
        />
      );
    }
    return this.props.children;
  }
}
