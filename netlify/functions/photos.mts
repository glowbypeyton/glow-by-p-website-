/**
 * Serves photo bytes out of Netlify Blobs.
 *
 * Progress photos are private: a client can only fetch their own, and the
 * studio can fetch any. Review photos are public, because they appear on the
 * Client Love page.
 */
import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { progressPhotos, reviewPhotos } from "../../db/schema.js";
import {
  ensureClient,
  fail,
  getSession,
  notFound,
  progressPhotoStore,
  reviewPhotoStore,
  toId,
  unauthorized,
} from "../../lib/portal.js";

function imageResponse(bytes: ArrayBuffer, contentType: string, isPublic: boolean) {
  return new Response(bytes, {
    headers: {
      "content-type": contentType,
      "cache-control": isPublic ? "public, max-age=3600" : "private, no-store",
    },
  });
}

export default async (req: Request, context: { params: { kind?: string; id?: string } }) => {
  if (req.method !== "GET") return fail("Method not allowed", 405);

  const id = toId(context.params.id);
  if (!id) return notFound();
  const isReviewPhoto = new URL(req.url).pathname.startsWith("/api/review-photos/");

  if (isReviewPhoto) {
    const [photo] = await db.select().from(reviewPhotos).where(eq(reviewPhotos.id, id)).limit(1);
    if (!photo) return notFound();
    const bytes = await reviewPhotoStore().get(photo.blobKey, { type: "arrayBuffer" });
    if (!bytes) return notFound();
    return imageResponse(bytes, photo.contentType, true);
  }

  const session = await getSession();
  if (!session) return unauthorized();

  const [photo] = await db.select().from(progressPhotos).where(eq(progressPhotos.id, id)).limit(1);
  if (!photo) return notFound();

  if (!session.isAdmin) {
    const client = await ensureClient(session.user);
    if (photo.clientId !== client.id) return notFound();
  }

  const bytes = await progressPhotoStore().get(photo.blobKey, { type: "arrayBuffer" });
  if (!bytes) return notFound();
  return imageResponse(bytes, photo.contentType, false);
};

export const config: Config = {
  path: ["/api/photos/:id", "/api/review-photos/:id"],
};
