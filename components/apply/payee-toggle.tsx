"use client";

import type { PayeeInput } from "@/types/apply";

type PayeeToggleProps = {
  checked: boolean;
  payee: PayeeInput | undefined;
  onCheckedChange: (checked: boolean) => void;
  onPayeeChange: (payee: PayeeInput) => void;
};

const fieldClass =
  "h-10 w-full rounded-lg border border-[#7f9384] bg-white px-3 text-sm text-[#0f1d18] outline-none transition-colors focus:border-[#115740] focus:ring-2 focus:ring-[#115740]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 disabled:cursor-not-allowed disabled:border-[#c8d7cf] disabled:bg-[#f1f6f3] disabled:text-[#5c6c65]";

export function PayeeToggle({ checked, payee, onCheckedChange, onPayeeChange }: PayeeToggleProps) {
  const unboundPayee = payee?.boundFinancePlatform === false ? payee : null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#24362f]">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            className="h-4 w-4 rounded border-[#7f9384] accent-[#115740] text-[#115740] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#115740]/25 active:scale-95 motion-reduce:active:scale-100"
          />
          <span className="font-medium">奖金领款人</span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
              checked
                ? "border border-[#ead7af] bg-[#fdf8ee] text-[#8a651b]"
                : "border border-[#d5e2db] bg-white text-[#5c6c65]"
            }`}
          >
            {checked ? "是 · 本队领款" : "否"}
          </span>
        </label>
        {checked && payee?.boundFinancePlatform ? (
          <span className="inline-flex items-center rounded-full border border-[#cde0d5] bg-[#eef5f1] px-2.5 py-0.5 text-xs font-medium text-[#115740]">
            已绑定校园卡财务账户，仅需学号核验
          </span>
        ) : null}
      </div>

      {checked && unboundPayee ? (
        <div className="grid gap-3 rounded-xl border border-[#d5e2db] bg-[#f8fbf9] p-4 md:grid-cols-2">
          <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
            <span className="text-sm font-medium text-[#24362f]">学习/工作单位</span>
            <input className={fieldClass} value={unboundPayee.organization} onChange={(event) => onPayeeChange({ ...unboundPayee, organization: event.target.value })} required />
          </label>
          <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
            <span className="text-sm font-medium text-[#24362f]">联系电话</span>
            <input className={`${fieldClass} tabular-nums`} value={unboundPayee.phone} onChange={(event) => onPayeeChange({ ...unboundPayee, phone: event.target.value })} required />
          </label>
          <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
            <span className="text-sm font-medium text-[#24362f]">身份证号</span>
            <input className={`${fieldClass} tabular-nums`} value={unboundPayee.idCard} onChange={(event) => onPayeeChange({ ...unboundPayee, idCard: event.target.value })} required />
          </label>
          <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
            <span className="text-sm font-medium text-[#24362f]">银行卡号</span>
            <input className={`${fieldClass} tabular-nums`} value={unboundPayee.bankCard} onChange={(event) => onPayeeChange({ ...unboundPayee, bankCard: event.target.value })} required />
          </label>
          <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
            <span className="text-sm font-medium text-[#24362f]">开户行（含支行）</span>
            <input className={fieldClass} value={unboundPayee.bankName} onChange={(event) => onPayeeChange({ ...unboundPayee, bankName: event.target.value })} required />
          </label>
          <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
            <span className="text-sm font-medium text-[#24362f]">开户人姓名</span>
            <input className={fieldClass} value={unboundPayee.accountName} onChange={(event) => onPayeeChange({ ...unboundPayee, accountName: event.target.value })} required />
          </label>
        </div>
      ) : null}
    </div>
  );
}
