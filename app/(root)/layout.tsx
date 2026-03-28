import Navbar from "@/components/Navbar";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import PageTransition from "@/components/PageTransition";

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { userId } = await auth();
  const authed = !!userId;

  return (
    <>
      <Suspense>
        <Navbar />
      </Suspense>
      <Suspense>
        {authed ? <PageTransition>{children}</PageTransition> : children}
      </Suspense>
    </>
  );
}
