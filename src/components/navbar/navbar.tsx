"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navItems = [
  { label: "Orders", href: "/orders" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Controls", href: "/controls" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileMenuOpen]);

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
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              aria-label="User profile"
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-200"
            >
              U
            </button>

            {isProfileMenuOpen ? (
              <div
                role="menu"
                aria-label="Account"
                className="absolute top-full right-6 z-50 -mt-1 min-w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="block w-full px-3.5 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                >
                  Settings
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="block w-full px-3.5 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
