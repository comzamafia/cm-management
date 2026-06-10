import { auth, signOut } from "@/auth";

export default async function AccessDeniedPage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mb-4 text-4xl">🚫</div>
        <h1 className="text-xl font-semibold text-slate-900">Access Denied</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your account{" "}
          {session?.user?.email && (
            <span className="font-medium text-slate-700">({session.user.email})</span>
          )}{" "}
          is not registered in the system. Ask your manager to add you.
        </p>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
