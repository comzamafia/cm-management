"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addComment, deleteComment } from "@/lib/comments";
import { formatDateTime } from "@/lib/labels";

type Comment = {
  id: string;
  body: string;
  createdAt: Date | string;
  user: { id: string; name: string };
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TaskComments({
  taskId,
  comments,
  currentUserId,
  canManage,
}: {
  taskId: string;
  comments: Comment[];
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await addComment(taskId, body);
      if (!res.ok) { setError(res.error); return; }
      setBody("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteComment(id);
      router.refresh();
    });
  }

  return (
    <div className="m-card p-6">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">
        Discussion ({comments.length})
      </h2>

      {comments.length === 0 && (
        <p className="mb-4 text-sm text-[#A19BA2]">No comments yet. Be the first to add one.</p>
      )}

      {comments.length > 0 && (
        <ul className="mb-5 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F0EBF0] text-xs font-bold text-[#440E48]">
                {initials(c.user.name)}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-[#140516]">{c.user.name}</span>
                  <span className="text-xs text-[#A19BA2]">{formatDateTime(c.createdAt)}</span>
                  {(c.user.id === currentUserId || canManage) && (
                    <button
                      onClick={() => remove(c.id)}
                      disabled={pending}
                      className="ml-auto text-xs text-[#A19BA2] hover:text-[#943B13] disabled:opacity-50"
                      aria-label="Delete comment"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-[#433745]">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="Add a comment… (Ctrl+Enter to submit)"
          className="w-full rounded-xl border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] placeholder-[#A19BA2] outline-none transition focus:border-[#440E48] focus:ring-2 focus:ring-[#440E48]/10"
        />
        {error && <p className="text-sm font-medium text-[#943B13]">{error}</p>}
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={pending || !body.trim()}
            className="m-btn disabled:opacity-60"
          >
            {pending ? "Posting…" : "Post Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}
