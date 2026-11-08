"use client";

import type { PayeeInput } from "@/types/apply";

type PayeeToggleProps = {
  checked: boolean;
  payee: PayeeInput | undefined;
  onCheckedChange: (checked: boolean) => void;
  onPayeeChange: (payee: PayeeInput) => void;
};

const fieldClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-600";

export function PayeeToggle({ checked, payee, onCheckedChange, onPayeeChange }: PayeeToggleProps) {
  const unboundPayee = payee?.boundFinancePlatform === false ? payee : null;
  return (
    <div className="space-y-3">
      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600"
        />
        <span className="font-medium">奖金领款人</span>
        <span className="text-xs text-slate-500">{checked ? "是" : "否"}</span>
      </label>
      {checked && payee?.boundFinancePlatform ? (
        <p className="text-xs text-emerald-700">已绑定校园卡银行账户，仅需学号。</p>
      ) : null}
      {checked && unboundPayee ? (
        <div className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-2">
          <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
            <span className="text-sm font-medium text-slate-700">学习/工作单位</span>
            <input className={fieldClass} value={unboundPayee.organization} onChange={(event) => onPayeeChange({ ...unboundPayee, organization: event.target.value })} required />
          </label>
          <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
            <span className="text-sm font-medium text-slate-700">联系电话</span>
            <input className={fieldClass} value={unboundPayee.phone} onChange={(event) => onPayeeChange({ ...unboundPayee, phone: event.target.value })} required />
          </label>
          <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
            <span className="text-sm font-medium text-slate-700">身份证号</span>
            <input className={fieldClass} value={unboundPayee.idCard} onChange={(event) => onPayeeChange({ ...unboundPayee, idCard: event.target.value })} required />
          </label>
          <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
            <span className="text-sm font-medium text-slate-700">银行卡号</span>
            <input className={fieldClass} value={unboundPayee.bankCard} onChange={(event) => onPayeeChange({ ...unboundPayee, bankCard: event.target.value })} required />
          </label>
          <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
            <span className="text-sm font-medium text-slate-700">开户行（含支行）</span>
            <input className={fieldClass} value={unboundPayee.bankName} onChange={(event) => onPayeeChange({ ...unboundPayee, bankName: event.target.value })} required />
          </label>
          <label className="grid gap-2 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-x-4">
            <span className="text-sm font-medium text-slate-700">开户人姓名</span>
            <input className={fieldClass} value={unboundPayee.accountName} onChange={(event) => onPayeeChange({ ...unboundPayee, accountName: event.target.value })} required />
          </label>
        </div>
      ) : null}
    </div>
  );
}
