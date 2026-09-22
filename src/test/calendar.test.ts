import { describe, expect, it } from "vitest";
import { exportCalendar } from "@/lib/export";
import type { Contact, Followup } from "@/lib/types";

const contact: Contact = {
  id: "ct-1",
  ownerId: null,
  status: "active",
  version: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  payload: {
    name: "王小明",
    company: "國泰,人壽",
    title: null,
    phone: "0912-345-678",
    email: "ming@example.com",
    address: null,
    website: null,
    notes: null,
    tags: [],
    ocrConfidence: null,
    ocrLowConfidenceFields: [],
  },
};

function followup(overrides: Partial<Followup> = {}): Followup {
  return {
    id: "fu-1",
    contactId: "ct-1",
    status: "pending",
    nextStep: "寄 DM; 確認需求",
    dueDate: "2026-08-08T00:00:00.000Z",
    completedAt: null,
    nextCommitment: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("P1-02: Google Calendar 單向提醒匯出", () => {
  it("只匯出 pending 且有 active contact 的回訪", () => {
    const ics = exportCalendar(
      [
        followup(),
        followup({ id: "fu-done", status: "done" }),
        followup({ id: "fu-missing", contactId: "missing" }),
      ],
      [contact],
      "2026-08-01T12:34:56.000Z",
    );

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260808");
    expect(ics).toContain("DTEND;VALUE=DATE:20260809");
    expect(ics).toContain("SUMMARY:回訪：王小明");
    expect(ics).toContain("DESCRIPTION:下一步：寄 DM\\; 確認需求\\n公司：國泰\\,人壽");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("TRIGGER:-PT15M");
    expect(ics).toMatch(/\r\nEND:VCALENDAR\r\n$/);
  });

  it("空 queue 仍產生可匯入的空 calendar", () => {
    const ics = exportCalendar([], [], "2026-08-01T12:34:56.000Z");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
    expect(ics).toMatch(/\r\nEND:VCALENDAR\r\n$/);
  });
});
