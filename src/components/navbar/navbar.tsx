"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
type NavbarProps = {
  onBuildBurgerClick?: () => void;
};

const navItems = [
  { label: "Orders", href: "/orders" },
  { label: "Dashboard", href: "/dashboard" },
] as const;
export function Navbar({ onBuildBurgerClick }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="BurgerBots logo"
            width={70}
            height={70}
            className="rounded-full object-cover invert"
            priority
          />
        </div>

        <nav>
          <ul className="flex items-center gap-8">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`border-b-2 pb-1 text-sm font-semibold transition-colors ${
                    pathname === item.href
                      ? "border-black text-black"
                      : "border-transparent text-zinc-700 hover:text-black"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex justify-end">
          {pathname === "/orders" ? (
            <button
              type="button"
              onClick={onBuildBurgerClick}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-zinc-800"
            >
              <span
                aria-hidden
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/12 text-[13px] leading-none"
              >
                +
              </span>
              Build Burger
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
