/**
 * 平台标识：取武汉大学老图书馆正面。
 * 四角攒尖顶（实心三角）+ 檐口 + 四根柱廊 + 台基。
 * 用 currentColor 取色，深底反白、浅底珞珈蓝都用同一份。
 *
 * 缩到 20px 时柱廊会糊，那时用 compact 版（只留屋顶 + 台基两层）。
 */
export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M12 2.2 4.4 9.2h15.2z" fill="currentColor" />
      {compact ? (
        <path d="M6.6 16.9h10.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      ) : (
        <>
          <path d="M3 10.1h18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
          <path
            d="M8.4 10.1v4.6M10.6 10.1v4.6M13.4 10.1v4.6M15.6 10.1v4.6"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M6.6 16.9h10.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        </>
      )}
    </svg>
  );
}
