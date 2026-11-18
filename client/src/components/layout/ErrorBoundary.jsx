import { Component } from 'react';
import Button from '../ui/Button.jsx';

/** Catches render errors in a page so the navbar/footer stay usable. Reset by changing `key` (e.g. the pathname). */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
        <p className="font-display text-7xl text-neutral-300 dark:text-neutral-700">oops.</p>
        <h1 className="mt-4 font-display text-4xl">This page hit a snag</h1>
        <p className="mt-3 text-neutral-600">Something went wrong while showing this page. Reloading usually fixes it.</p>
        <div className="mt-8 flex gap-2">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Button variant="secondary" as="a" href="/">Go home</Button>
        </div>
      </main>
    );
  }
}
