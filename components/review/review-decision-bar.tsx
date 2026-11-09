"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { RegistrationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { RejectDialog } from "@/components/review/reject-dialog";
import type { ApiResponse } from "@/types/api";
import type { ReviewOperationResult } from "@/types/review";

/**
 * 审核详情页顶部的通过 / 驳回。
 * 原来详情页只能看，要操作得退回列表再找那条，审十条就要来回切二十次。
 * 级别由当前状态推出来，与列表页的 levelForStatus 同一套规则：
 * PENDING → 学院级，COLLEGE_REVIEW → 校级；其他状态（已通过、已驳回）不给操作。
 */
export function ReviewDecisionBar({
  projectId,
  projectName,
  status,
}: {
  projectId: string;
  projectName: string;
  status: RegistrationStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const level = status === "PENDING" ? "COLLEGE" : status === "COLLEGE_REVIEW" ? "SCHOOL" : null;
  if (!level) return null;

  async function approve() {
    setPending("approve");
    try {
      const response = await fetch("/api/review/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, level }),
      });
      const result = (await response.json()) as ApiResponse<ReviewOperationResult | null>;
      if (!response.ok || result.code !== 0 || !result.data) throw new Error(result.message || "审核操作失败");
      toast.success(result.message || "已通过");
      router.push("/review");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "审核操作失败");
    } finally {
      setPending(null);
    }
  }

  async function reject(reason: string) {
    setPending("reject");
    try {
      const response = await fetch("/api/review/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, level, reason }),
      });
      const result = (await response.json()) as ApiResponse<ReviewOperationResult | null>;
      if (!response.ok || result.code !== 0 || !result.data) throw new Error(result.message || "驳回操作失败");
      toast.success(result.message || "已驳回");
      setRejecting(false);
      router.push("/review");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "驳回操作失败");
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-red-200 text-red-700 hover:bg-red-50"
          disabled={pending !== null}
          onClick={() => setRejecting(true)}
        >
          驳回
        </Button>
        <Button type="button" size="sm" loading={pending === "approve"} disabled={pending !== null} onClick={() => void approve()}>
          {level === "COLLEGE" ? "学院通过" : "校级通过"}
        </Button>
      </div>
      {rejecting ? (
        <RejectDialog
          title={`驳回「${projectName}」`}
          pending={pending === "reject"}
          onCancel={() => setRejecting(false)}
          onConfirm={(reason) => void reject(reason)}
        />
      ) : null}
    </>
  );
}
