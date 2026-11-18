/**
 * 武大校园建筑与文化识别图形库（WHU Visual Identity Kit）
 *
 * 统一采用 1.25px 精密建筑线稿语言，色源严格锚定武汉大学官方 VI 双色：
 * - 珞珈蓝 #002554（RGB 0,37,84）
 * - 珞珈绿 #115740（RGB 17,87,64，老图书馆孔雀琉璃瓦）
 */

/** 老图书馆四角攒尖顶屋脊细线分隔符：替代普通灰线，在章节过渡处保留轻巧校园印记 */
export function WhuRoofDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center gap-3 ${className ?? ""}`}>
      <span className="h-px flex-1 bg-gradient-to-r from-[#115740]/20 via-[#dde5e0] to-[#dde5e0]" />
      <svg className="h-3.5 w-6 shrink-0 text-[#115740]/65" fill="none" viewBox="0 0 28 16">
        <path
          d="M2 13.5c4.5-.6 8.2-3.4 12-9.5 3.8 6.1 7.5 8.9 12 9.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
        <path d="M6 13.5h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.25" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-[#115740]/20 via-[#dde5e0] to-[#dde5e0]" />
    </div>
  );
}

/** 武大老斋舍三孔拱门 + 樱顶石阶暗纹：用于横幅角落或侧栏底部的极淡空间水印 */
export function WhuArchWatermark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 240 140">
      {/* 屋檐飞角与重檐轮廓 */}
      <path
        d="M16 44c34-3 66-14 104-34 38 20 70 31 104 34"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.25"
      />
      <path d="M36 52h168" stroke="currentColor" strokeLinecap="round" strokeWidth="1.25" />
      {/* 三孔老斋舍拱门 */}
      <path
        d="M54 132V92a22 22 0 0 1 44 0v40M98 132V84a22 22 0 0 1 44 0v48M142 132V92a22 22 0 0 1 44 0v40"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      {/* 台基与石阶线 */}
      <path d="M24 132h192M64 112h24M108 108h24M152 112h24" stroke="currentColor" strokeLinecap="round" strokeWidth="1.1" />
    </svg>
  );
}

/** 学院朱文印信角标（1% 斋舍绛朱点睛）：用于核心看板标题旁或正式题头 */
export function WhuSeal({
  label = "珞珈台账",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded border border-[#9e2a35]/50 bg-[#9e2a35]/[0.045] px-1.5 py-0.5 font-display text-[11px] font-bold tracking-[0.08em] text-[#9e2a35] ${className ?? ""}`}
    >
      {label}
    </span>
  );
}

/** 绿琉璃 + 斋舍绛朱双色短尺：放在大标题下方与副标题同行，形成武大建筑色锚点 */
export function WhuTitleRule({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-center gap-[3px] ${className ?? ""}`}>
      <span className="h-[2.5px] w-[22px] rounded-full bg-[#115740]" />
      <span className="h-[2.5px] w-[7px] rounded-full bg-[#9e2a35]" />
    </span>
  );
}

/** 老图书馆重檐飞角线稿暗纹：垫于核心主卡右下角（约 5% 透明度） */
export function WhuEavesWatermark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 220 130">
      <path d="M30 56 Q110 20 190 56" strokeLinecap="round" />
      <path d="M10 82 Q110 48 210 82" strokeLinecap="round" />
      <line x1="48" x2="48" y1="82" y2="126" />
      <line x1="88" x2="88" y1="80" y2="126" />
      <line x1="132" x2="132" y1="80" y2="126" />
      <line x1="172" x2="172" y1="82" y2="126" />
      <line strokeLinecap="round" x1="22" x2="198" y1="126" y2="126" />
    </svg>
  );
}

/** 校门牌坊线稿徽记：用于空态与缺省封面 */
export function WhuGateEmblem({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 64 44">
      <path
        d="M6 15c8-1 17-5 26-10 9 5 18 9 26 10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <path d="M10 19h44M16 19v20M26 19v20M38 19v20M48 19v20M8 39h48" stroke="currentColor" strokeLinecap="round" strokeWidth="1.35" />
      <rect height="6" rx="1" stroke="currentColor" strokeWidth="1.2" width="12" x="26" y="23" />
    </svg>
  );
}
