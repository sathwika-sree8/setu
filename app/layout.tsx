import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import localFont from "next/font/local";
import "easymde/dist/easymde.min.css";
import { Toaster } from "@/components/ui/toaster";
import { ClerkProvider } from "@clerk/nextjs";
import AuthSync from "@/components/AuthSync";
import BottomDock from "@/components/chat/BottomDock";
import { auth } from "@clerk/nextjs/server";

const workSans = localFont({
  display: "swap",
  src:[
    {
      path:'./fonts/WorkSans-Black.ttf',
      weight:'900',
      style:'normal',
    },    {
      path:'./fonts/WorkSans-ExtraBold.ttf',
      weight:'800',
      style:'normal',
    },    {
      path:'./fonts/WorkSans-Bold.ttf',
      weight:'700',
      style:'normal',
    },    {
      path:'./fonts/WorkSans-SemiBold.ttf',
      weight:'600',
      style:'normal',
    },    {
      path:'./fonts/WorkSans-Medium.ttf',
      weight:'500',
      style:'normal',
    },    {
      path:'./fonts/WorkSans-Regular.ttf',
      weight:'400',
      style:'normal',
    },    {
      path:'./fonts/WorkSans-Black.ttf',
      weight:'900',
      style:'normal',
    },    {
      path:'./fonts/WorkSans-Thin.ttf',
      weight:'200',
      style:'normal',
    },    {
      path:'./fonts/WorkSans-ExtraLight.ttf',
      weight:'100',
      style:'normal',
    },
  ],
  variable:'--font-work-sans',
})

export const metadata: Metadata = {
  title: "SETU",
  description: "Pitch, Vote and Grow",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  const authedBodyClass = userId ? "dark bg-black text-white" : "";

  return (
    <html lang="en">
      <body
        className={`${workSans.variable} ${authedBodyClass}`}
      >
        <ClerkProvider>
          <AuthSync />
          <div className="pb-[60px]">{children}</div>
          <BottomDock />
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}

