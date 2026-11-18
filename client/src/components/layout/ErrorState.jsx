import Button from '../ui/Button.jsx';

export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-7xl text-neutral-300 dark:text-neutral-700">oops.</p>
      <h1 className="mt-4 font-display text-4xl">{title}</h1>
      {message && <p className="mt-3 text-neutral-500">{message}</p>}
      {onRetry && (
        <Button variant="secondary" className="mt-8" onClick={() => onRetry()}>
          Try again
        </Button>
      )}
    </main>
  );
}
