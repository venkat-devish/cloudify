import Image from "next/image";

const LOGO_SRC = "/brand/cloudify-squirrel.png";

export default function CloudifyLogo({
  size = 40,
  showWordmark = true,
  wordmarkClassName = "font-semibold text-white",
  subtitle,
}: {
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  subtitle?: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Image
        src={LOGO_SRC}
        alt="Cloudify"
        width={size}
        height={size}
        className="shrink-0 rounded-xl object-cover ring-2 ring-rose-500/25"
        priority
      />
      {showWordmark && (
        <span className="min-w-0">
          <span className={`block truncate text-[15px] leading-tight tracking-tight ${wordmarkClassName}`}>Cloudify</span>
          {subtitle && <span className="mt-1 block truncate text-xs text-slate-400">{subtitle}</span>}
        </span>
      )}
    </span>
  );
}

export { LOGO_SRC };
