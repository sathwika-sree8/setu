  "use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { BadgePlus, Briefcase } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";

const Navbar = () => {
  const { isSignedIn, user } = useUser();

  return (
    <header className="px-5 py-3 bg-white shadow-sm font-work-sans">
      <nav className="flex justify-between items-center">
        {/* Logo */}
        <Link href="/">
          <Image src="/logo.png" alt="logo" width={144} height={30} />
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-5 text-black">
          {isSignedIn && user ? (
            <>
              {/* Feed */}
              <Link href="/feed">
                <button className="btn-secondary">Feed</button>
              </Link>

              {/* Requests */}
              <Link href="/user/me/requests">
                <button className="btn-secondary flex items-center gap-2">
                  <Briefcase className="size-4" />
                  <span>Requests</span>
                </button>
              </Link>

              {/* Portfolio */}
              <Link href="/user/me/portfolio">
                <button className="btn-secondary">Portfolio</button>
              </Link>

              {/* Create */}
              <Link href="/startup/create">
                <span className="max-sm:hidden">Create</span>
                <BadgePlus className="size-6 sm:hidden" />
              </Link>

              {/* Profile */}
              <Link href={`/user/me`}>
                <Avatar className="size-10">
                  <AvatarImage
                    src={user.imageUrl}
                    alt={user.fullName || ""}
                  />
                  <AvatarFallback>
                    {user.firstName?.[0] ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>

              {/* Clerk menu (logout included) */}
              <UserButton afterSignOutUrl="/" showName />
            </>
          ) : (
            <>
              {/* Clerk handles Google + GitHub automatically */}
              <SignInButton fallbackRedirectUrl="/">
                <button className="btn-primary" suppressHydrationWarning>Login</button>
              </SignInButton>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
