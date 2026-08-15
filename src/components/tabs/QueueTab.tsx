"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { FollowupCard } from "../FollowupCard";
import { EmptyState } from "../Common";
import { Users } from "lucide-react";

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
      <h2 id="queue-h" className="font-heading text-3xl font-bold flex items-center gap-2 text-white">
        <Users className="w-6 h-6 text-accent-500" /> 全部待回訪 ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <EmptyState title="沒有待回訪" hint="在『聯絡人』分頁新增即可加入 queue。" />
      ) : (
        <ul className="space-y-3" data-testid="all-queue">
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