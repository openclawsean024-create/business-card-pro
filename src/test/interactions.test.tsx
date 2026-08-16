// 互動記錄新功能測試:
//   - Interaction.kind 8 種 union (schema-version 2)
//   - LogInteractionForm UI 流程 (ContactRow inline + TimelineTab quick log)

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStore } from "@/lib/store";
import { emptyAppState } from "@/lib/types";
import { LogInteractionForm } from "@/components/LogInteractionForm";

beforeEach(() => {
  if (typeof window !== "undefined") window.localStorage.clear();
  useStore.setState({ ...emptyAppState() });
});

describe("Interaction.kind enum (schema-version 2)", () => {
  it("addInteraction 接受所有 8 種 kind 並寫入 store", () => {
    const contact = useStore.getState().addContact(
      {
        name: "測試",
        company: "Test Co",
        title: null,
        phone: null,
        email: null,
        address: null,
        website: null,
        notes: null,
        tags: [],
        ocrConfidence: null,
        ocrLowConfidenceFields: [],
      },
      undefined,
    ).contact;

    const allKinds = [
      "note",
      "call",
      "email",
      "meeting",
      "line",
      "wechat",
      "dm",
      "visit",
    ] as const;

    for (const k of allKinds) {
      useStore.getState().addInteraction(
        contact.id,
        k,
        `summary for ${k}`,
        null,
      );
    }

    const interactions = useStore.getState().interactions;
    expect(interactions).toHaveLength(8);
    const kinds = interactions.map((it) => it.kind).sort();
    expect(kinds).toEqual([...allKinds].sort());

    // 確認每筆的 schema 正確
    interactions.forEach((it) => {
      expect(it).toHaveProperty("id");
      expect(it.contactId).toBe(contact.id);
      expect(it.summary).toMatch(/^summary for /);
      expect(it.occurredAt).toMatch(/T/); // ISO-8601
      expect(it.createdAt).toMatch(/T/);
    });
  });

  it("addInteraction 把 nextCommitment 正確存進 Interaction", () => {
    const contact = useStore.getState().addContact(
      {
        name: null,
        company: "Co",
        title: null,
        phone: null,
        email: null,
        address: null,
        website: null,
        notes: null,
        tags: [],
        ocrConfidence: null,
        ocrLowConfidenceFields: [],
      },
      undefined,
    ).contact;

    const it = useStore
      .getState()
      .addInteraction(contact.id, "call", "聊過了", "下週寄 DM");
    expect(it.summary).toBe("聊過了");
    expect(it.nextCommitment).toBe("下週寄 DM");
  });

  it("addInteraction nextCommitment = null 仍正確存", () => {
    const contact = useStore.getState().addContact(
      {
        name: "X",
        company: null,
        title: null,
        phone: null,
        email: null,
        address: null,
        website: null,
        notes: null,
        tags: [],
        ocrConfidence: null,
        ocrLowConfidenceFields: [],
      },
      undefined,
    ).contact;

    const it = useStore.getState().addInteraction(contact.id, "note", "備忘", null);
    expect(it.nextCommitment).toBeNull();
  });
});

describe("LogInteractionForm UI", () => {
  it("未開啟時顯示 3 個 primary 按鈕 (見面/通話/LINE) + 其他", () => {
    const contact = useStore.getState().addContact(
      {
        name: "王小明",
        company: "國泰",
        title: null,
        phone: null,
        email: null,
        address: null,
        website: null,
        notes: null,
        tags: [],
        ocrConfidence: null,
        ocrLowConfidenceFields: [],
      },
      undefined,
    ).contact;

    render(<LogInteractionForm contactId={contact.id} />);

    // 3 個 primary 按鈕
    expect(screen.getByRole("button", { name: /見面/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /通話/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /LINE/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /其他/ })).toBeInTheDocument();

    // 還沒送出表單,所以沒有互動紀錄
    expect(useStore.getState().interactions).toHaveLength(0);
  });

  it("點『見面』→ 填表單 → 送出 → store 有新 meeting 互動", async () => {
    const user = userEvent.setup();
    const contact = useStore.getState().addContact(
      {
        name: "王小明",
        company: null,
        title: null,
        phone: null,
        email: null,
        address: null,
        website: null,
        notes: null,
        tags: [],
        ocrConfidence: null,
        ocrLowConfidenceFields: [],
      },
      undefined,
    ).contact;

    let result: ReturnType<typeof render> | undefined;
    await act(async () => {
      result = render(<LogInteractionForm contactId={contact.id} />);
      await Promise.resolve();
    });

    // 點「見面」
    const meetingBtn = screen.getByRole("button", { name: /見面/ });
    await user.click(meetingBtn);

    // 出現 textarea + 互動類型 select
    const textarea = screen.getByLabelText(/互動內容/) as HTMLTextAreaElement;
    const kindSelect = screen.getByLabelText(/互動類型/) as HTMLSelectElement;

    // 確認預設 kind = meeting
    expect(kindSelect.value).toBe("meeting");

    // 改 kind 到 wechat (其他類型 dropdown)
    await user.selectOptions(kindSelect, "wechat");
    expect(kindSelect.value).toBe("wechat");

    // 填 summary + next
    await user.type(textarea, "微信談合作");
    const nextInput = screen.getByLabelText(/下次承諾/) as HTMLInputElement;
    await user.type(nextInput, "明天再聯絡");

    // 送出
    const submitBtn = screen.getByRole("button", { name: /記錄/ });
    await user.click(submitBtn);

    // Store 有新互動
    const interactions = useStore.getState().interactions;
    expect(interactions).toHaveLength(1);
    expect(interactions[0]?.kind).toBe("wechat");
    expect(interactions[0]?.summary).toBe("微信談合作");
    expect(interactions[0]?.nextCommitment).toBe("明天再聯絡");
    expect(interactions[0]?.contactId).toBe(contact.id);

    // 收回表單
    expect(screen.queryByLabelText(/互動內容/)).toBeNull();
  });

  it("empty summary 不能送出", async () => {
    const user = userEvent.setup();
    const contact = useStore.getState().addContact(
      {
        name: "X",
        company: null,
        title: null,
        phone: null,
        email: null,
        address: null,
        website: null,
        notes: null,
        tags: [],
        ocrConfidence: null,
        ocrLowConfidenceFields: [],
      },
      undefined,
    ).contact;

    await act(async () => {
      render(<LogInteractionForm contactId={contact.id} />);
      await Promise.resolve();
    });

    await user.click(screen.getByRole("button", { name: /見面/ }));

    const submitBtn = screen.getByRole("button", { name: /記錄/ });
    await user.click(submitBtn);

    // HTML5 required 防止 empty submit → store 沒新增
    expect(useStore.getState().interactions).toHaveLength(0);
  });
});