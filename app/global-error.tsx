"use client";

/** 全局兜底：根 layout 本身出错时也会显示，必须自带 html / body。 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, background: "#edf4ef", fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif' }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <section style={{ width: "100%", maxWidth: 420, borderRadius: 12, border: "1px solid #d5e2db", background: "#fff", padding: 32, textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0e1d17" }}>平台暂时无法加载</h1>
            <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.7, color: "#54635d" }}>
              应用初始化时发生错误，请重试或稍后再访问。
            </p>
            {error.digest ? (
              <p style={{ marginTop: 12, fontSize: 12, color: "#7a8b83" }}>错误编号：{error.digest}</p>
            ) : null}
            <button
              onClick={() => reset()}
              style={{ marginTop: 24, height: 40, padding: "0 24px", borderRadius: 9999, border: 0, background: "#002554", color: "#fff", fontSize: 14, cursor: "pointer" }}
              type="button"
            >
              重试
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
