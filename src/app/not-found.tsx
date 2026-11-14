import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm font-semibold text-muted">404</p>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link href="/" className="text-sm font-medium underline underline-offset-4">
        Go back home
      </Link>
    </main>
  );
}
