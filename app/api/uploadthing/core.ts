import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { createClient } from "@/utils/supabase/server";

const f = createUploadthing();

export const ourFileRouter = {
  customerDocument: f({ 
    image: { maxFileSize: "16MB", maxFileCount: 10 }, 
    pdf: { maxFileSize: "16MB", maxFileCount: 10 } 
  })
    .middleware(async ({ req }) => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new UploadThingError("Unauthorized");

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete:", file.name, "by user:", metadata.userId);
      return { url: file.url, key: file.key };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
