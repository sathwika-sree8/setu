import React from 'react'
import Ping from '@/components/Ping';
import {client} from "@/sanity/lib/client";
import {STARTUP_VIEWS_QUERY} from "@/sanity/lib/queries";
import { writeClient } from '@/sanity/lib/write-client';

interface ViewProps {
  id: string;
}
const View = async ({ id }: ViewProps) => {
  const result = await client.withConfig(
    {useCdn:false}).fetch(STARTUP_VIEWS_QUERY,{id});

  const totalViews = result?.views || 0;

  void writeClient
    .patch(id)
    .set({views:totalViews + 1})
    .commit()

  return (
    <div className="view-container">
    <div className="absolute -top-2 -right-2">
      <Ping/>
    </div>
    <p className="view-text">
        <span className="font-black">Views:{totalViews}</span>
    </p>
    </div>  
  )
}

export default View;
