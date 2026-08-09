"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { FollowupCard } from "../FollowupCard";
import { EmptyState } from "../Common";
import { Users } from "lucide-react";

/** SPEC §3.1 FR-003 配套: 全部 pending follow-up(不限今日) */
export function QueueTab() {
  const all = useStore((s) => s.followups);
  const contacts = useStore((s) => s.contacts);
  const completeFollowup = useStore((s) => s.completeFollowup);

  const pending = useMemo(() => {
    return all
      .filter((f) => f.status === "pending")
      .map((f) => ({
        ...f,
        contact: contacts.find((c) => c.id === f.contactId) ?? null,
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [all, contacts]);

  return (
    <section aria-labelledby="queue-h" className="space-y-4">
      <h2 id="queue-h" className="text-xl font-semibold flex items-center gap-2">
        <Users className="w-5 h-5" /> 全部待回訪 ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <EmptyState title="沒有待回訪" hint="在『聯絡人』分頁新增即可加入 queue。" />
      ) : (
        <ul className="space-y-2" data-testid="all-queue">
          {pending.map((fu) => (
            <FollowupCard
              key={fu.id}
              followup={fu}
              contact={fu.contact}
              onComplete={completeFollowup}
            />
          ))}
        </ul>
      )}
    </section>
  );
}