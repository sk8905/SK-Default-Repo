import { LoginForm } from "./LoginForm";

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-paper">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl text-ink mb-1">Legal Updates</h1>
        <p className="font-sans text-sm text-slate-600 mb-6">Enter your access password.</p>
        <LoginForm next={searchParams.next || "/"} />
      </div>
    </main>
  );
}
