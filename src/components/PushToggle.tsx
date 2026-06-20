"use client";

import { useEffect, useState } from "react";
import { savePushSubscription, removePushSubscription } from "@/lib/push-actions";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "loading" | "unsupported" | "denied" | "off" | "on" | "busy";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window) ||
        !VAPID_PUBLIC
      ) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") { setState("denied"); return; }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? "on" : "off");
      } catch {
        setState("off");
      }
    })();
  }, []);

  async function enable() {
    setErr(null);
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return; }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
        });
      }
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      if (!res.ok) { setErr(res.error ?? "Failed"); setState("off"); return; }
      setState("on");
    } catch (e) {
      setErr((e as Error).message);
      setState("off");
    }
  }

  async function disable() {
    setErr(null);
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch (e) {
      setErr((e as Error).message);
      setState("on");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E4DDE4] bg-white p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f3eef3] text-[#440E48]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-[#140516]">Push notifications</div>
        <div className="text-xs text-[#726973]">
          {state === "on" && "On — you'll get alerts on this device even when the app is closed."}
          {state === "off" && "Get task & alert notifications on this device."}
          {state === "denied" && "Blocked in your browser settings. Allow notifications for this site, then retry."}
          {state === "unsupported" && "This browser/device doesn't support push notifications."}
          {(state === "loading" || state === "busy") && "Checking…"}
        </div>
        {err && <div className="mt-1 text-xs font-medium text-[#e2445c]">{err}</div>}
      </div>
      {state === "on" && (
        <button onClick={disable} className="rounded-lg border border-[#E4DDE4] px-3 py-2 text-xs font-semibold text-[#726973] hover:bg-[#FAF6FA]">
          Turn off
        </button>
      )}
      {state === "off" && (
        <button onClick={enable} className="rounded-lg bg-[#440E48] px-4 py-2 text-xs font-semibold text-white hover:brightness-110">
          Enable
        </button>
      )}
      {state === "busy" && (
        <button disabled className="rounded-lg bg-[#440E48] px-4 py-2 text-xs font-semibold text-white opacity-60">…</button>
      )}
    </div>
  );
}
