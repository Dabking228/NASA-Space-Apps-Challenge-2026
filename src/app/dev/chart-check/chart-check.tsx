'use client';

import { Component, type ReactNode } from 'react';
import { Line, LineChart, XAxis, YAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import { useCounterStore } from '@/store/counter-store';

const SAMPLE_POINTS = [
  { label: 'A', value: 2 },
  { label: 'B', value: 5 },
  { label: 'C', value: 3 },
  { label: 'D', value: 7 },
  { label: 'E', value: 4 },
];

interface ChartErrorBoundaryProps {
  children: ReactNode;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

class ChartErrorBoundary extends Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  state: ChartErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <p role="alert" className="text-destructive">
          Chart failed to render
        </p>
      );
    }
    return this.props.children;
  }
}

export function ChartCheck() {
  const count = useCounterStore((s) => s.count);
  const increment = useCounterStore((s) => s.increment);
  const reset = useCounterStore((s) => s.reset);

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Chart check</h1>
      <ChartErrorBoundary>
        <LineChart width={480} height={240} data={SAMPLE_POINTS}>
          <XAxis dataKey="label" />
          <YAxis />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--status-green)"
            isAnimationActive={false}
          />
        </LineChart>
      </ChartErrorBoundary>
      <div className="flex items-center gap-3">
        <span>Count: {count}</span>
        <Button onClick={increment}>Increment</Button>
        <Button variant="outline" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
