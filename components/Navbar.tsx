"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { BadgePlus, Briefcase } from "lucide-react";
import { SignInButton, useUser } from "@clerk/nextjs";

const Navbar = () => {
  const { isSignedIn, user } = useUser();

  return (
    <header className="border-b border-black/10 bg-white px-5 py-3 font-work-sans shadow-sm dark:border-white/10 dark:bg-black">
      <nav className="flex items-center justify-between">
        <Link href="/">
          <Image src="/logo.png" alt="logo" width={144} height={30} />
        </Link>

        <div className="flex items-center gap-5 text-black dark:text-white">
          {isSignedIn && user ? (
            <>
              <Link href="/feed">
                <button className="btn-secondary">Feed</button>
              </Link>

              <Link href="/user/me/requests">
                <button className="btn-secondary flex items-center gap-2">
                  <Briefcase className="size-4" />
                  <span>Requests</span>
                </button>
              </Link>

              <Link href="/user/me/portfolio">
                <button className="btn-secondary">Portfolio</button>
              </Link>

              <Link href={`/user/${user.id}`}>
                <button className="btn-secondary">Profile</button>
              </Link>

              <Link href="/startup/create">
                <button className="btn-primary flex items-center gap-2">
                  <span className="max-sm:hidden">Create</span>
                  <BadgePlus className="size-5 sm:hidden" />
                </button>
              </Link>
            </>
          ) : (
            <SignInButton fallbackRedirectUrl="/">
              <button
                className="rounded-full border-[3px] border-black bg-black px-5 py-2 text-sm font-semibold text-white shadow-100 transition hover:shadow-200 dark:border-white/10 dark:bg-orange-500 dark:shadow-none dark:hover:bg-orange-400"
                suppressHydrationWarning
              >
                Login
              </button>
            </SignInButton>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
