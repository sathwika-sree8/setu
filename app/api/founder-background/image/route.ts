import { auth } from "@clerk/nextjs/server";
import imageUrlBuilder from "@sanity/image-url";
import { writeClient } from "@/sanity/lib/write-client";
import { dataset, projectId } from "@/sanity/env";

export const runtime = "nodejs";

const builder = imageUrlBuilder({ projectId, dataset });

type UploadedSanityAsset = {
  _id: string;
  url?: string;
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const asset = (await writeClient.assets.upload("image", buffer, {
      filename: file.name,
      contentType: file.type,
    })) as UploadedSanityAsset;

    const url = asset.url || builder.image(asset).url();

    return Response.json({ ok: true, url });
  } catch (error) {
    console.error("[FOUNDER_BACKGROUND_IMAGE_UPLOAD_ERROR]", error);
    return Response.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
