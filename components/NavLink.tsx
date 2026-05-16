"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, type AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className"> {
  href?: string;
  to?: string;
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  end?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  (
    {
      className,
      activeClassName,
      pendingClassName,
      href,
      to,
      end = false,
      children,
      ...props
    },
    ref
  ) => {
    const pathname = usePathname();
    const targetHref = href ?? to ?? "#";

    const isActive =
      end || targetHref === "/"
        ? pathname === targetHref
        : pathname === targetHref || pathname.startsWith(`${targetHref}/`);

    return (
      <Link
        ref={ref}
        href={targetHref}
        className={cn(
          className,
          isActive && activeClassName,
          false && pendingClassName
        )}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };