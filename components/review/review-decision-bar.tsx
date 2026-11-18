"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { RegistrationStatus } from "@prisma/client";
import { RejectDialog } from "@/components/review/reject-dialog";
import { Button } from "@/components/ui/button";
import type { ApiResponse } from "@/types/api";
import type { ReviewOperationResult } from "@/types/review";

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
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-red-200 bg-white text-red-700 hover:bg-red-50"
          disabled={pending !== null}
          onClick={() => setRejecting(true)}
        >
          驳回
        </Button>
        <Button
          type="button"
          size="sm"
          className="bg-[#115740] text-white hover:bg-[#0d4633]"
          loading={pending === "approve"}
          disabled={pending !== null}
          onClick={() => void approve()}
        >
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
