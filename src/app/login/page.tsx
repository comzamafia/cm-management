import { signIn } from "@/auth";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

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

      {/* Sign-in card */}
      <div className="relative w-full max-w-[340px] overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/40">
        {/* Gold accent bar at top */}
        <div
          className="h-[3px] w-full"
          style={{
            background: "linear-gradient(90deg, #9F4000, #F4A626 40%, #F4A626 60%, #9F4000)",
          }}
        />

        <div className="flex flex-col items-center px-8 pb-8 pt-8">
          {/* Logo */}
          <div className="mb-5 flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#FAF6FA] shadow-inner ring-1 ring-[#E4DDE4]">
            <Image
              src="/logo.png"
              alt="Chiang Mai Thai Dining"
              width={72}
              height={72}
              className="h-[72px] w-[72px] object-contain"
              priority
            />
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

          {/* Google sign-in */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
            className="w-full"
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E4DDE4] bg-white px-4 py-3 text-sm font-medium text-[#433745] shadow-sm transition-all hover:border-[#440E48] hover:bg-[#FAF6FA] hover:text-[#440E48] hover:shadow"
            >
              <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
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
