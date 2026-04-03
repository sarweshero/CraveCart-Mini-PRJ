import Image from "next/image";
import Link from "next/link";

export function BrandLogo({
  href = "/",
  width = 180,
  className = "",
}: {
  href?: string;
  width?: number;
  className?: string;
}) {
  const height = Math.round((width * 340) / 680);

  return (
    <Link href={href} className={className}>
      <Image src="/cravecart-logo.svg" alt="CraveCart" width={width} height={height} priority className="h-auto" />
    </Link>
  );
}
