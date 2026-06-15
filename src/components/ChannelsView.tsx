"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postMessage, deleteMessage } from "@/lib/channels";

type Channel = { key: string; name: string; locationId: string | null };
type Member = { id: string; name: string };
type Message = {
  id: string; body: string; mentions: string[]; createdAt: string;
  authorId: string; authorName: string; canDelete: boolean;
};

function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
function timeLabel(iso: string) {
  const d = new Date(iso); const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ChannelsView({
  channels, activeKey, messages, members, currentUserId,
}: {
  channels: Channel[]; activeKey: string; messages: Message[]; members: Member[]; currentUserId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState<{ query: string } | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const activeName = channels.find((c) => c.key === activeKey)?.name ?? "Channel";

  // Poll for new messages every 20s.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(t);
  }, [router]);

  // Auto-scroll to newest.
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const memberByLongestName = useMemo(
    () => [...members].sort((a, b) => b.name.length - a.name.length),
    [members],
  );

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setText(v);
    const caret = e.target.selectionStart ?? v.length;
    const before = v.slice(0, caret);
    const m = before.match(/@([^\s@]*)$/);
    setMenu(m ? { query: m[1].toLowerCase() } : null);
  };

  const insertMention = (name: string) => {
    const ta = taRef.current; if (!ta) return;
    const caret = ta.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([^\s@]*)$/, `@${name} `);
    const next = before + text.slice(caret);
    setText(next); setMenu(null);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(before.length, before.length); });
  };

  const filtered = menu
    ? members.filter((m) => m.name.toLowerCase().includes(menu.query)).slice(0, 6)
    : [];

  const send = () => {
    const body = text.trim();
    if (!body) return;
    // Derive mention ids from names present in the text.
    const ids = memberByLongestName.filter((m) => body.includes(`@${m.name}`)).map((m) => m.id);
    setSending(true);
    startTransition(async () => {
      const res = await postMessage(activeKey, body, ids);
      setSending(false);
      if (!res.ok) { setErr(res.error); return; }
      setText(""); setErr(null); router.refresh();
    });
  };

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
      {/* Channel list */}
      <aside className="m-card hidden flex-col overflow-y-auto p-2 lg:flex">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">Channels</div>
        {channels.map((c) => {
          const active = c.key === activeKey;
          return (
            <Link key={c.key} href={`/channels?c=${c.key}`}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-[#440E48] text-white" : "text-[#433745] hover:bg-[#FAF6FA]"}`}>
              <span className={active ? "text-white" : "text-[#A19BA2]"}>{c.locationId ? "#" : "★"}</span>
              <span className="truncate">{c.name}</span>
            </Link>
          );
        })}
      </aside>

      {/* Thread */}
      <section className="m-card flex min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-[#eee] px-5 py-3">
          <span className="text-[#440E48]">{activeKey === "company" ? "★" : "#"}</span>
          <h2 className="text-base font-bold text-[#140516]">{activeName}</h2>
          {/* Mobile channel switcher */}
          <select value={activeKey} onChange={(e) => router.push(`/channels?c=${e.target.value}`)}
            className="ml-auto rounded-md border border-[#E4DDE4] px-2 py-1 text-xs lg:hidden">
            {channels.map((c) => (<option key={c.key} value={c.key}>{c.name}</option>))}
          </select>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.map((m) => (
            <div key={m.id} className="group flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#440E48] text-[10px] font-bold text-white">{initials(m.authorName)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#140516]">{m.authorName}</span>
                  <span className="text-[11px] text-[#A19BA2]">{timeLabel(m.createdAt)}</span>
                  {m.canDelete && (
                    <button onClick={() => startTransition(() => { void deleteMessage(m.id).then(() => router.refresh()); })}
                      className="ml-auto text-[#C9C4C9] opacity-0 transition-opacity hover:text-[#e2445c] group-hover:opacity-100" title="Delete">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-[#433745]">{renderBody(m.body, memberByLongestName, currentUserId, members)}</p>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="grid h-full place-items-center text-center text-sm text-[#A19BA2]">
              <div>
                <div className="text-2xl">💬</div>
                No messages yet. Start the conversation — keep work talk here, not in WhatsApp.
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="relative border-t border-[#eee] p-3">
          {err && <div className="mb-2 text-xs font-medium text-[#e2445c]">{err}</div>}
          {menu && filtered.length > 0 && (
            <div className="absolute bottom-full left-3 mb-1 w-56 overflow-hidden rounded-lg border border-[#E4DDE4] bg-white shadow-lg">
              {filtered.map((u) => (
                <button key={u.id} onClick={() => insertMention(u.name)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#FAF6FA]">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#440E48] text-[9px] font-bold text-white">{initials(u.name)}</span>
                  {u.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea ref={taRef} value={text} onChange={onChange} rows={1}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !menu) { e.preventDefault(); send(); } }}
              placeholder={`Message ${activeName}…  (type @ to mention)`}
              className="max-h-32 flex-1 resize-none rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]" />
            <button onClick={send} disabled={sending || !text.trim()}
              className="m-btn shrink-0 disabled:opacity-50">{sending ? "…" : "Send"}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Render message body with @mentions highlighted. */
function renderBody(body: string, membersByLen: Member[], currentUserId: string, members: Member[]) {
  if (membersByLen.length === 0) return body;
  const esc = membersByLen.map((m) => m.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`@(${esc.join("|")})`, "g");
  const parts: (string | { name: string })[] = [];
  let last = 0; let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    if (match.index > last) parts.push(body.slice(last, match.index));
    parts.push({ name: match[1] });
    last = match.index + match[0].length;
  }
  if (last < body.length) parts.push(body.slice(last));
  const meName = members.find((m) => m.id === currentUserId)?.name;
  return parts.map((p, i) => {
    if (typeof p === "string") return <span key={i}>{p}</span>;
    const isMe = p.name === meName;
    return <span key={i} className={`rounded px-1 font-semibold ${isMe ? "bg-[#F4A626]/25 text-[#9F4000]" : "text-[#440E48]"}`}>@{p.name}</span>;
  });
}
