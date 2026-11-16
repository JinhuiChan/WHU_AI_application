"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type ReactNode } from "react";

// Keep the native file input: existing refs, change handlers and FormData continue to work.
export function FileDropZone({ children, label, showSelection = true }: {
  children: ReactNode;
  label: string;
  showSelection?: boolean;
}) {
  const region = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);
  const [active, setActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const input = () => region.current?.querySelector<HTMLInputElement>('input[type="file"]');
  const disabled = () => !input() || input()!.matches(":disabled");

  useEffect(() => {
    const form = region.current?.querySelector<HTMLInputElement>('input[type="file"]')?.form;
    const reset = () => { setFileName(""); setError(""); setActive(false); dragDepth.current = 0; };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);

  function receive(files: File[]) {
    const target = input();
    if (!target || disabled()) return;
    if (files.length !== 1) {
      setError(files.length ? "每次请添加一个文件" : "未收到文件。请复制文件本身后粘贴，或将文件拖入；仅复制路径或文字不能上传文件。");
      return;
    }
    const file = files[0];
    const accepted = target.accept.toLowerCase().split(",").map((item) => item.trim()).filter(Boolean);
    if (accepted.length && !accepted.some((item) => item.startsWith(".") ? file.name.toLowerCase().endsWith(item) : item.endsWith("/*") ? file.type.toLowerCase().startsWith(item.slice(0, -1)) : file.type.toLowerCase() === item)) {
      setError("该文件不符合此处支持的格式，请按原有格式要求选择文件。");
      return;
    }
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      target.files = transfer.files;
      setError("");
      target.dispatchEvent(new Event("change", { bubbles: true }));
      setFileName(target.files?.[0]?.name ?? "");
    } catch {
      setError("浏览器未能接收文件，请使用选择文件按钮。");
    }
  }

  function paste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const files = Array.from(event.clipboardData.files);
    receive(files.length ? files : Array.from(event.clipboardData.items).filter((item) => item.kind === "file").map((item) => item.getAsFile()).filter((file): file is File => file !== null));
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setActive(false); dragDepth.current = 0;
    receive(Array.from(event.dataTransfer.files));
  }

  return (
    <div ref={region} role="group" aria-label={label + "拖放与粘贴区域"} tabIndex={0}
      onPaste={paste} onDrop={drop}
      onDragEnter={(event) => { event.preventDefault(); if (!disabled()) { dragDepth.current++; setActive(true); } }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = disabled() ? "none" : "copy"; }}
      onDragLeave={(event) => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setActive(false); }}
      onChange={() => { setError(""); setFileName(input()?.files?.[0]?.name ?? ""); }}
      className={"min-w-0 rounded-lg border border-dashed p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 " + (active ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white")}>
      {children}
      <p className="mt-2 text-xs leading-5 text-slate-500">{active ? "松开即可添加文件" : "可拖入单个文件；点击此区域后按 Ctrl+V 粘贴文件。"}</p>
      {showSelection && fileName ? <p aria-live="polite" className="mt-1 break-all text-xs text-blue-700">已选择：{fileName}</p> : null}
      {error ? <p role="alert" className="mt-1 text-xs leading-5 text-red-600">{error}</p> : null}
    </div>
  );
}
