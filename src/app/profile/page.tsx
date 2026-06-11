import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">My Profile</h1>
        <p className="mt-0.5 text-sm text-[#726973]">Update your name, phone, and password.</p>
      </div>
      <ProfileForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone ?? null,
          locationName: user.location?.name ?? null,
        }}
      />
    </div>
  );
}
