"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) router.replace("/");
    else setError("Wrong password");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50">
      <form onSubmit={submit} className="w-80 rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-stone-900">Sleep monitor</h1>
        <p className="mb-6 text-sm text-stone-500">Enter the dashboard password</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="mb-3 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
        />
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {busy ? "..." : "Enter"}
        </button>
      </form>
    </main>
  );
}
