export default function AccessDeniedPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "linear-gradient(150deg, #440E48 0%, #2D0930 55%, #1A0520 100%)" }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl text-center">
        <div
          className="h-[3px] w-full"
          style={{ background: "linear-gradient(90deg, #9F4000, #F4A626 40%, #F4A626 60%, #9F4000)" }}
        />
        <div className="px-8 py-10">
          <div className="mb-4 text-4xl">🚫</div>
          <h1 className="text-xl font-semibold text-[#140516]">Access Denied</h1>
          <p className="mt-2 text-sm text-[#726973]">
            Your account is not registered in the system. Ask your manager to add you.
          </p>
          <a
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#440E48] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5A1560] transition"
          >
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
