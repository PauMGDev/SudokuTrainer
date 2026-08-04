import { copy } from '../copy';

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-2 px-4">
      <h1 className="font-mono text-2xl tracking-tight">{copy.app.title}</h1>
      <p className="text-ink-muted">{copy.app.tagline}</p>
    </main>
  );
}
