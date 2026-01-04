import Navbar from "@/components/Navbar";
import { Suspense } from "react";
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
    <Suspense>
        <Navbar />
      </Suspense>
      <Suspense>
        {children}
      </Suspense>
    </>
  );
}
