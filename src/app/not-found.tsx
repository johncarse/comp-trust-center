export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100/70 px-4 text-slate-900">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Trust center not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          There is no published trust center for this address.
        </p>
      </div>
    </main>
  );
}
