import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter = {
  customerDocument: f({ 
    image: { maxFileSize: "16MB", maxFileCount: 10 }, 
    pdf: { maxFileSize: "16MB", maxFileCount: 10 } 
  })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete:", file.name);
      return { url: file.url, key: file.key };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
