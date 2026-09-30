"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

const MAX_BYTES = 5 * 1024 * 1024; // matches "Max 5MB" in the upload form

export async function uploadToCloudinary(formData: FormData) {
  // Server actions are public endpoints; only signed-in users may upload
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("No file provided");
  }
  if (!file.type.startsWith("image/")) throw new Error("Only image files are supported");
  if (file.size > MAX_BYTES) throw new Error("Image must be 5MB or smaller");

  // Convert file to buffer for Cloudinary
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: "budget-app-receipts" }, // Optional: organize in a folder
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Upload failed"));
        } else {
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      }
    ).end(buffer);
  });
}
