"use client";

import type { User } from "@supabase/supabase-js";
import { ChefHat, LayoutDashboard, Menu, SlidersHorizontal, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { clearAuthorized } from "@/lib/auth";

const navItems: readonly { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Orders", href: "/orders", icon: ChefHat },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Controls", href: "/controls", icon: SlidersHorizontal },
];

function getGoogleAvatarUrl(user: User | null) {
  if (!user) {
    return null;
  }

  const fromMetadata = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
  if (typeof fromMetadata === "string" && fromMetadata.length > 0) {
    return fromMetadata;
  }

  const googleIdentity = user.identities?.find((identity) => identity.provider === "google");
  const fromIdentity =
    googleIdentity?.identity_data?.avatar_url ?? googleIdentity?.identity_data?.picture;
  if (typeof fromIdentity === "string" && fromIdentity.length > 0) {
    return fromIdentity;
  }

  return null;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const mobileMenuRef = useRef<HTMLLIElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = () => {
    setIsProfileMenuOpen(false);
    clearAuthorized();
    const { client } = getBrowserSupabaseClient();
    if (client) {
      void client.auth.signOut();
    }
    router.push("/login");
  };

  useEffect(() => {
    const { client } = getBrowserSupabaseClient();
    if (!client) {
      return;
    }

    const applyAvatar = (user: User | null) => {
      setAvatarUrl(getGoogleAvatarUrl(user));
    };

    void client.auth.getSession().then(({ data }) => {
      applyAvatar(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      applyAvatar(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        mobileMenuRef.current?.contains(target) ||
        desktopMenuRef.current?.contains(target)
      ) {
        return;
      }

      setIsProfileMenuOpen(false);
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
    <header className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 md:static md:inset-auto md:z-auto md:w-full md:max-w-none md:translate-x-0">
      <div className="flex items-center gap-1 rounded-full border border-zinc-200/80 bg-white/95 px-1.5 py-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.14)] backdrop-blur-md md:grid md:grid-cols-[1fr_auto_1fr] md:gap-3 md:rounded-2xl md:border-zinc-200 md:bg-white md:px-4 md:py-3 md:shadow-sm md:backdrop-blur-none">
        <div className="hidden items-center gap-2 md:flex">
          <Image
            src="/logo.png"
            alt="BurgerBots logo"
            width={70}
            height={70}
            className="h-[70px] w-[70px] rounded-full object-cover invert"
            priority
          />
        </div>

        <nav className="min-w-0 flex-1 md:flex-none md:justify-self-center">
          <ul className="flex items-center gap-1 md:gap-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <li key={item.href} className="min-w-0 flex-1 md:flex-none">
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-full px-1 py-1.5 text-[11px] font-semibold leading-none transition-colors md:flex-row md:rounded-none md:border-b-2 md:bg-transparent md:px-0 md:py-0 md:pb-1 md:text-sm md:leading-normal ${
                      isActive
                        ? "bg-zinc-900 text-white md:border-black md:text-black"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 md:border-transparent md:text-zinc-700 md:hover:bg-transparent md:hover:text-black"
                    }`}
                  >
                    <Icon aria-hidden className="h-4 w-4 shrink-0 md:hidden" strokeWidth={2} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li ref={mobileMenuRef} className="relative min-w-0 flex-1 md:hidden">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                onClick={() => setIsProfileMenuOpen((open) => !open)}
                className={`flex w-full flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-full px-1 py-1.5 text-[11px] font-semibold leading-none transition-colors ${
                  isProfileMenuOpen
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <Menu aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2} />
                More
              </button>

              {isProfileMenuOpen ? (
                <div
                  role="menu"
                  aria-label="Account"
                  className="absolute right-0 bottom-full z-50 mb-3 min-w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
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
                    onClick={handleSignOut}
                    className="block w-full px-3.5 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </li>
          </ul>
        </nav>

        <div className="hidden justify-end md:flex">
          <div ref={desktopMenuRef} className="relative">
            <button
              type="button"
              aria-label="User profile"
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-200 md:h-10 md:w-10"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                "U"
              )}
            </button>

            {isProfileMenuOpen ? (
              <div
                role="menu"
                aria-label="Account"
                className="absolute right-0 bottom-full z-50 mb-2 min-w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg md:top-full md:right-6 md:bottom-auto md:-mt-1 md:mb-0"
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
                  onClick={handleSignOut}
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
