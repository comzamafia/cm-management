"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOGO_DATA_URI } from "@/lib/logo";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error ?? "Login failed. Please try again.");
      }
    });
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12"
      style={{
        background: "linear-gradient(150deg, #440E48 0%, #2D0930 55%, #1A0520 100%)",
      }}
    >
      {/* Soft ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #F4A626 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 -left-24 h-72 w-72 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #9F4000 0%, transparent 70%)" }}
        />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-[340px] overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/40">
        {/* Gold accent bar */}
        <div
          className="h-[3px] w-full"
          style={{
            background:
              "linear-gradient(90deg, #9F4000, #F4A626 40%, #F4A626 60%, #9F4000)",
          }}
        />

        <div className="flex flex-col items-center px-8 pb-8 pt-8">
          {/* Logo */}
          <div className="mb-5 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#FAF6FA] shadow-inner ring-1 ring-[#E4DDE4]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_DATA_URI} alt="Chiang Mai Thai Dining" className="h-[100px] w-[100px] object-contain" />
          </div>

          {/* Brand name */}
          <h1
            className="text-center text-[28px] font-light tracking-[0.14em] text-[#440E48]"
            style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
          >
            CHIANG MAI
          </h1>
          <p className="mt-1 text-[10px] font-semibold tracking-[0.25em] text-[#9F4000]">
            THAI DINING
          </p>

          {/* Divider */}
          <div className="my-6 flex w-full items-center gap-3">
            <div className="h-px flex-1 bg-[#E4DDE4]" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A19BA2]">
              Operations
            </span>
            <div className="h-px flex-1 bg-[#E4DDE4]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-3">
            <div>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E4DDE4] bg-[#FDFBFD] px-4 py-2.5 text-sm text-[#140516] placeholder-[#A19BA2] outline-none transition focus:border-[#440E48] focus:ring-2 focus:ring-[#440E48]/10"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#E4DDE4] bg-[#FDFBFD] px-4 py-2.5 pr-10 text-sm text-[#140516] placeholder-[#A19BA2] outline-none transition focus:border-[#440E48] focus:ring-2 focus:ring-[#440E48]/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A19BA2] hover:text-[#726973]"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {error && (
              <p className="rounded-lg bg-[#FFF0EE] px-3 py-2 text-xs text-[#943B13]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#440E48] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5A1560] disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] text-[#A19BA2]">
            Authorised staff only
          </p>
        </div>
      </div>

      <p className="relative mt-7 text-[10px] tracking-[0.15em] text-white/25">
        © CHIANG MAI THAI DINING
      </p>
    </div>
  );
}
