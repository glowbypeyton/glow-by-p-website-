/**
 * Public feed for the Client Love page: published testimonials, newest first,
 * each with any before/after photos the studio attached in the admin portal.
 */
import type { Config } from "@netlify/functions";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { reviewPhotos, reviews } from "../../db/schema.js";
import { fail, json } from "../../lib/portal.js";

export default async (req: Request) => {
  if (req.method !== "GET") return fail("Method not allowed", 405);

  try {
    return await feed();
  } catch {
    // The page should never show an error where testimonials go — an empty
    // feed renders the friendly "check back soon" note instead.
    return json({ reviews: [] });
  }
};

async function feed () {
  const published = await db
    .select()
    .from(reviews)
    .where(eq(reviews.isPublished, true))
    .orderBy(asc(reviews.position), desc(reviews.id));

  const ids = published.map((review) => review.id);
  const photos = ids.length
    ? await db
        .select()
        .from(reviewPhotos)
        .where(inArray(reviewPhotos.reviewId, ids))
        .orderBy(asc(reviewPhotos.position), asc(reviewPhotos.id))
    : [];

  return json({
    reviews: published.map((review) => ({
      id: review.id,
      displayName: review.displayName,
      rating: review.rating,
      service: review.service,
      quote: review.quote,
      photos: photos
        .filter((photo) => photo.reviewId === review.id)
        .map((photo) => ({
          id: photo.id,
          url: `/api/review-photos/${photo.id}`,
          label: photo.label,
        })),
    })),
  });
}

export const config: Config = {
  path: "/api/reviews",
};
