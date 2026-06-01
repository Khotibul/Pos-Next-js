import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  href?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function AppLogo({ href, className, imageClassName, priority = false }: AppLogoProps) {
  const logo = (
    <Image
      src="/posqu-pro.png"
      alt="Posqu Pro"
      width={170}
      height={52}
      priority={priority}
      className={cn("h-10 w-auto object-contain", imageClassName)}
    />
  );

  if (!href) {
    return <div className={cn("flex min-w-0 items-center", className)}>{logo}</div>;
  }

  return (
    <Link href={href} prefetch className={cn("flex min-w-0 items-center", className)}>
      {logo}
    </Link>
  );
}
