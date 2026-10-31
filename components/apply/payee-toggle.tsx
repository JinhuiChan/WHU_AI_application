"use client";

import type { PayeeInput } from "@/types/apply";

type PayeeToggleProps = {
  checked: boolean;
  payee: PayeeInput | undefined;
  onCheckedChange: (checked: boolean) => void;
  onPayeeChange: (payee: PayeeInput) => void;
};

const fieldClass = "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600";

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
        <div className="grid gap-3 rounded-md bg-slate-50 p-3 md:grid-cols-2">
          <label className="text-xs text-slate-600">学习/工作单位
            <input className={fieldClass} value={unboundPayee.organization} onChange={(event) => onPayeeChange({ ...unboundPayee, organization: event.target.value })} required />
          </label>
          <label className="text-xs text-slate-600">联系电话
            <input className={fieldClass} value={unboundPayee.phone} onChange={(event) => onPayeeChange({ ...unboundPayee, phone: event.target.value })} required />
          </label>
          <label className="text-xs text-slate-600">身份证号
            <input className={fieldClass} value={unboundPayee.idCard} onChange={(event) => onPayeeChange({ ...unboundPayee, idCard: event.target.value })} required />
          </label>
          <label className="text-xs text-slate-600">银行卡号
            <input className={fieldClass} value={unboundPayee.bankCard} onChange={(event) => onPayeeChange({ ...unboundPayee, bankCard: event.target.value })} required />
          </label>
          <label className="text-xs text-slate-600">开户行（含支行）
            <input className={fieldClass} value={unboundPayee.bankName} onChange={(event) => onPayeeChange({ ...unboundPayee, bankName: event.target.value })} required />
          </label>
          <label className="text-xs text-slate-600">开户人姓名
            <input className={fieldClass} value={unboundPayee.accountName} onChange={(event) => onPayeeChange({ ...unboundPayee, accountName: event.target.value })} required />
          </label>
        </div>
      ) : null}
    </div>
  );
}
