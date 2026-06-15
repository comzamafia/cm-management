import { getCurrentUser } from "@/lib/auth";
import { getChannels, getChannelView } from "@/lib/channels";
import { ChannelsView } from "@/components/ChannelsView";

export const dynamic = "force-dynamic";

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to view channels.</div>;

  const channels = await getChannels(user);
  const { c } = await searchParams;
  // Default to the user's own location channel if available, else company-wide.
  const fallback = channels.find((ch) => ch.locationId === user.locationId)?.key ?? "company";
  const activeKey = channels.some((ch) => ch.key === c) ? (c as string) : fallback;

  const view = await getChannelView(user, activeKey);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Channels</h1>
        <p className="mt-0.5 text-sm text-[#726973]">
          One place for branch chat — replaces scattered WhatsApp groups. Mention people with @.
        </p>
      </div>
      <ChannelsView
        channels={channels}
        activeKey={activeKey}
        messages={view?.messages ?? []}
        members={view?.members ?? []}
        currentUserId={user.id}
      />
    </div>
  );
}
