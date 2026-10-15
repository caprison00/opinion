"use client";

import { button } from "@/components/ui";
import { deleteIssue } from "./actions";

export default function DeleteIssueButton({
  id,
  count,
}: {
  id: string;
  count: number;
}) {
  return (
    <form
      action={deleteIssue}
      onSubmit={(e) => {
        const msg = count
          ? `이 이슈를 지울까요? 묶여 있던 질문 ${count}개는 지워지지 않고 '이슈 없음'이 돼요.`
          : "이 이슈를 지울까요?";
        if (!confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className={`${button.smallSecondary} !text-negative-strong`}>
        삭제
      </button>
    </form>
  );
}
