import Image from "next/image";
import whuEmblem from "../../public/images/whu/whu-emblem.svg";

/**
 * 武汉大学官方校徽组件：静态导入 SVG，绕过 middleware 对 /images 的拦截。
 * framed=true 时垫一层 1.5px 纯白圆环，用于深绿侧栏或深色横幅上保持校徽外圈清晰对比。
 */
export function WhuCrest({
  size = 38,
  framed = false,
  className = "",
}: {
  size?: number;
  framed?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${
        framed ? "bg-white p-[1.5px]" : ""
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        alt="武汉大学校徽"
        height={size}
        src={whuEmblem}
        unoptimized
        width={size}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

/**
 * 平台标识（备用单色老图书馆线稿图标）
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
