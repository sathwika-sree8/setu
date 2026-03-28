import React from 'react'
import StartupForm from '@/components/StartupForm'
import { auth } from "@clerk/nextjs/server";
import { redirect } from 'next/navigation';
const page = async() => {
    const session = await auth();
  if(!session.userId) redirect("/");
  return (
    <>
    <section className="pink_container !min-h-[230px]">
    <h1 className="heading">Submit Your Startup</h1>
    </section>
    <StartupForm />
    </>
  )
}

export default page

