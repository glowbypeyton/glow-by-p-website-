/**
 * Admin portal API — studio-only. Every route is gated on the signed-in user
 * being an admin (email listed in ADMIN_EMAILS, or the `admin` role in the
 * Netlify Identity dashboard).
 */
import type { Config } from "@netlify/functions";
import { asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  appointments,
  clients,
  orderItems,
  orders,
  progressPhotos,
  reviewPhotos,
  reviews,
  routineItems,
} from "../../db/schema.js";
import {
  badRequest,
  cents,
  decodeImageDataUrl,
  forbidden,
  getSession,
  isoDate,
  json,
  newBlobKey,
  notFound,
  progressPhotoStore,
  reviewPhotoStore,
  text,
  toId,
  unauthorized,
} from "../../lib/portal.js";

const PHASES = ["am", "pm", "weekly"];
const APPOINTMENT_STATUS = ["completed", "upcoming", "cancelled"];
const ORDER_STATUS = ["pending", "paid", "shipped", "picked-up", "cancelled"];

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function oneOf(value: unknown, allowed: string[], fallback: string): string {
  const candidate = text(value, 40).toLowerCase();
  return allowed.includes(candidate) ? candidate : fallback;
}

function priceCentsOrNull(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  return cents(value);
}

/* ---------------------------------------------------------------- clients */

async function listClients() {
  const [rows, photoCounts, visitCounts, orderCounts] = await Promise.all([
    db.select().from(clients).orderBy(desc(clients.createdAt), desc(clients.id)),
    db
      .select({ clientId: progressPhotos.clientId, total: count() })
      .from(progressPhotos)
      .groupBy(progressPhotos.clientId),
    db
      .select({ clientId: appointments.clientId, total: count() })
      .from(appointments)
      .groupBy(appointments.clientId),
    db
      .select({ clientId: orders.clientId, total: count() })
      .from(orders)
      .groupBy(orders.clientId),
  ]);

  const lookup = (list: Array<{ clientId: number; total: number }>, id: number) =>
    Number(list.find((entry) => entry.clientId === id)?.total ?? 0);

  return json({
    clients: rows.map((client) => ({
      id: client.id,
      email: client.email,
      fullName: client.fullName,
      phone: client.phone,
      skinType: client.skinType,
      createdAt: client.createdAt,
      photoCount: lookup(photoCounts, client.id),
      appointmentCount: lookup(visitCounts, client.id),
      orderCount: lookup(orderCounts, client.id),
    })),
  });
}

async function clientDetail(clientId: number) {
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) return notFound();

  const [routine, photos, visits, purchases, clientReviews] = await Promise.all([
    db
      .select()
      .from(routineItems)
      .where(eq(routineItems.clientId, clientId))
      .orderBy(asc(routineItems.position), asc(routineItems.id)),
    db
      .select()
      .from(progressPhotos)
      .where(eq(progressPhotos.clientId, clientId))
      .orderBy(desc(progressPhotos.takenOn), desc(progressPhotos.id)),
    db
      .select()
      .from(appointments)
      .where(eq(appointments.clientId, clientId))
      .orderBy(desc(appointments.visitedOn), desc(appointments.id)),
    db
      .select()
      .from(orders)
      .where(eq(orders.clientId, clientId))
      .orderBy(desc(orders.placedOn), desc(orders.id)),
    db.select().from(reviews).where(eq(reviews.clientId, clientId)),
  ]);

  const orderIds = purchases.map((order) => order.id);
  const items = orderIds.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
    : [];

  return json({
    client,
    routine,
    photos: photos.map((photo) => ({
      id: photo.id,
      url: `/api/photos/${photo.id}`,
      caption: photo.caption,
      takenOn: photo.takenOn,
      uploadedBy: photo.uploadedBy,
    })),
    appointments: visits,
    orders: purchases.map((order) => ({
      ...order,
      items: items.filter((item) => item.orderId === order.id),
    })),
    reviews: clientReviews,
  });
}

/* ---------------------------------------------------------------- reviews */

async function listReviews() {
  const [rows, photos] = await Promise.all([
    db.select().from(reviews).orderBy(asc(reviews.position), desc(reviews.id)),
    db.select().from(reviewPhotos).orderBy(asc(reviewPhotos.position), asc(reviewPhotos.id)),
  ]);

  return json({
    reviews: rows.map((review) => ({
      ...review,
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

/* ----------------------------------------------------------------- router */

export default async (req: Request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!session.isAdmin) return forbidden();

  const segments = new URL(req.url).pathname.split("/").filter(Boolean).slice(2);
  const [resource, rawId, subResource] = segments;
  const id = toId(rawId);
  const method = req.method;

  /* --------------------------------------------------------- /clients */
  if (resource === "clients") {
    if (!id && method === "GET") return listClients();
    if (!id) return notFound();

    const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    if (!client) return notFound();

    if (!subResource && method === "GET") return clientDetail(id);

    if (!subResource && method === "PUT") {
      const body = await readBody(req);
      await db
        .update(clients)
        .set({
          fullName: text(body.fullName, 120),
          phone: text(body.phone, 40),
          skinType: text(body.skinType, 80),
          concerns: text(body.concerns, 600),
          routineNote: text(body.routineNote, 1200),
          adminNotes: text(body.adminNotes, 4000),
          updatedAt: new Date(),
        })
        .where(eq(clients.id, id));
      return json({ saved: true });
    }

    // Replace the whole routine in one save — the editor sends every step.
    if (subResource === "routine" && method === "PUT") {
      const body = await readBody(req);
      const incoming = Array.isArray(body.items) ? body.items.slice(0, 60) : [];
      const rows = incoming
        .map((entry, index) => {
          const item = (entry || {}) as Record<string, unknown>;
          const productName = text(item.productName, 200);
          if (!productName) return null;
          return {
            clientId: id,
            phase: oneOf(item.phase, PHASES, "am"),
            position: Number.parseInt(String(item.position ?? index), 10) || index,
            productName,
            howToUse: text(item.howToUse, 600),
            productUrl: text(item.productUrl, 500),
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      await db.delete(routineItems).where(eq(routineItems.clientId, id));
      if (rows.length) await db.insert(routineItems).values(rows);
      if (typeof body.routineNote === "string") {
        await db
          .update(clients)
          .set({ routineNote: text(body.routineNote, 1200), updatedAt: new Date() })
          .where(eq(clients.id, id));
      }
      return json({ saved: true, steps: rows.length });
    }

    if (subResource === "photos" && method === "POST") {
      const body = await readBody(req);
      const image = decodeImageDataUrl(body.image);
      if (!image) return badRequest("Please choose a JPEG, PNG or WebP photo under 4MB.");

      const blobKey = newBlobKey(`client-${id}`);
      await progressPhotoStore().set(blobKey, image.bytes);
      const [photo] = await db
        .insert(progressPhotos)
        .values({
          clientId: id,
          blobKey,
          contentType: image.contentType,
          caption: text(body.caption, 240),
          takenOn: isoDate(body.takenOn),
          uploadedBy: "admin",
        })
        .returning();

      return json(
        {
          photo: {
            id: photo.id,
            url: `/api/photos/${photo.id}`,
            caption: photo.caption,
            takenOn: photo.takenOn,
            uploadedBy: photo.uploadedBy,
          },
        },
        201,
      );
    }

    if (subResource === "appointments" && method === "POST") {
      const body = await readBody(req);
      const serviceName = text(body.serviceName, 200);
      if (!serviceName) return badRequest("Please add the service name.");
      const [appointment] = await db
        .insert(appointments)
        .values({
          clientId: id,
          serviceName,
          visitedOn: isoDate(body.visitedOn),
          status: oneOf(body.status, APPOINTMENT_STATUS, "completed"),
          notes: text(body.notes, 2000),
          priceCents: priceCentsOrNull(body.price),
        })
        .returning();
      return json({ appointment }, 201);
    }

    if (subResource === "orders" && method === "POST") {
      const body = await readBody(req);
      const lines = (Array.isArray(body.items) ? body.items.slice(0, 40) : [])
        .map((entry) => {
          const item = (entry || {}) as Record<string, unknown>;
          const productName = text(item.productName, 200);
          if (!productName) return null;
          return {
            productName,
            qty: Math.min(Math.max(Number.parseInt(String(item.qty ?? 1), 10) || 1, 1), 99),
            unitPriceCents: cents(item.price),
          };
        })
        .filter((line): line is NonNullable<typeof line> => line !== null);

      if (!lines.length) return badRequest("Add at least one product to the order.");

      const [order] = await db
        .insert(orders)
        .values({
          clientId: id,
          orderRef: text(body.orderRef, 60),
          placedOn: isoDate(body.placedOn),
          totalCents: lines.reduce((sum, line) => sum + line.unitPriceCents * line.qty, 0),
          status: oneOf(body.status, ORDER_STATUS, "paid"),
          notes: text(body.notes, 1000),
        })
        .returning();

      await db.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));
      return json({ orderId: order.id }, 201);
    }

    return notFound();
  }

  /* ---------------------------------------------------------- /photos/:id */
  if (resource === "photos" && id) {
    if (method === "DELETE") {
      const [photo] = await db
        .select()
        .from(progressPhotos)
        .where(eq(progressPhotos.id, id))
        .limit(1);
      if (!photo) return notFound();
      await progressPhotoStore().delete(photo.blobKey);
      await db.delete(progressPhotos).where(eq(progressPhotos.id, id));
      return json({ deleted: true });
    }
    if (method === "PUT") {
      const body = await readBody(req);
      await db
        .update(progressPhotos)
        .set({ caption: text(body.caption, 240), takenOn: isoDate(body.takenOn) })
        .where(eq(progressPhotos.id, id));
      return json({ saved: true });
    }
    return notFound();
  }

  /* ---------------------------------------------------- /appointments/:id */
  if (resource === "appointments" && id) {
    if (method === "PUT") {
      const body = await readBody(req);
      const serviceName = text(body.serviceName, 200);
      if (!serviceName) return badRequest("Please add the service name.");
      await db
        .update(appointments)
        .set({
          serviceName,
          visitedOn: isoDate(body.visitedOn),
          status: oneOf(body.status, APPOINTMENT_STATUS, "completed"),
          notes: text(body.notes, 2000),
          priceCents: priceCentsOrNull(body.price),
        })
        .where(eq(appointments.id, id));
      return json({ saved: true });
    }
    if (method === "DELETE") {
      await db.delete(appointments).where(eq(appointments.id, id));
      return json({ deleted: true });
    }
    return notFound();
  }

  /* --------------------------------------------------------- /orders/:id */
  if (resource === "orders" && id) {
    if (method === "PUT") {
      const body = await readBody(req);
      await db
        .update(orders)
        .set({
          status: oneOf(body.status, ORDER_STATUS, "pending"),
          orderRef: text(body.orderRef, 60),
          notes: text(body.notes, 1000),
          placedOn: isoDate(body.placedOn),
        })
        .where(eq(orders.id, id));
      return json({ saved: true });
    }
    if (method === "DELETE") {
      await db.delete(orders).where(eq(orders.id, id));
      return json({ deleted: true });
    }
    return notFound();
  }

  /* ------------------------------------------------------------- /reviews */
  if (resource === "reviews") {
    if (!id && method === "GET") return listReviews();

    if (!id && method === "POST") {
      const body = await readBody(req);
      const displayName = text(body.displayName, 120);
      const quote = text(body.quote, 2000);
      if (!displayName || !quote) return badRequest("Add a client name and their words.");

      const [review] = await db
        .insert(reviews)
        .values({
          clientId: toId(String(body.clientId ?? "")) ?? null,
          displayName,
          quote,
          rating: Math.min(Math.max(Number.parseInt(String(body.rating ?? 5), 10) || 5, 1), 5),
          service: text(body.service, 120),
          isPublished: body.isPublished !== false,
          position: Number.parseInt(String(body.position ?? 0), 10) || 0,
        })
        .returning();
      return json({ review }, 201);
    }

    if (!id) return notFound();

    if (!subResource && method === "PUT") {
      const body = await readBody(req);
      const displayName = text(body.displayName, 120);
      const quote = text(body.quote, 2000);
      if (!displayName || !quote) return badRequest("Add a client name and their words.");
      await db
        .update(reviews)
        .set({
          clientId: toId(String(body.clientId ?? "")) ?? null,
          displayName,
          quote,
          rating: Math.min(Math.max(Number.parseInt(String(body.rating ?? 5), 10) || 5, 1), 5),
          service: text(body.service, 120),
          isPublished: body.isPublished !== false,
          position: Number.parseInt(String(body.position ?? 0), 10) || 0,
        })
        .where(eq(reviews.id, id));
      return json({ saved: true });
    }

    if (!subResource && method === "DELETE") {
      const attached = await db.select().from(reviewPhotos).where(eq(reviewPhotos.reviewId, id));
      const store = reviewPhotoStore();
      await Promise.all(attached.map((photo) => store.delete(photo.blobKey)));
      await db.delete(reviews).where(eq(reviews.id, id));
      return json({ deleted: true });
    }

    // Before/after photos on a testimonial.
    if (subResource === "photos" && method === "POST") {
      const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
      if (!review) return notFound();

      const body = await readBody(req);
      const image = decodeImageDataUrl(body.image);
      if (!image) return badRequest("Please choose a JPEG, PNG or WebP photo under 4MB.");

      const blobKey = newBlobKey(`review-${id}`);
      await reviewPhotoStore().set(blobKey, image.bytes);
      const [photo] = await db
        .insert(reviewPhotos)
        .values({
          reviewId: id,
          blobKey,
          contentType: image.contentType,
          label: text(body.label, 40),
          position: Number.parseInt(String(body.position ?? 0), 10) || 0,
        })
        .returning();

      return json(
        { photo: { id: photo.id, url: `/api/review-photos/${photo.id}`, label: photo.label } },
        201,
      );
    }

    return notFound();
  }

  /* ------------------------------------------------- /review-photos/:id */
  if (resource === "review-photos" && id && method === "DELETE") {
    const [photo] = await db.select().from(reviewPhotos).where(eq(reviewPhotos.id, id)).limit(1);
    if (!photo) return notFound();
    await reviewPhotoStore().delete(photo.blobKey);
    await db.delete(reviewPhotos).where(eq(reviewPhotos.id, id));
    return json({ deleted: true });
  }

  /* --------------------------------- copy a client's photo onto a review */
  if (resource === "review-photos" && !id && method === "POST") {
    const body = await readBody(req);
    const reviewId = toId(String(body.reviewId ?? ""));
    const photoId = toId(String(body.photoId ?? ""));
    if (!reviewId || !photoId) return badRequest("Pick a review and a progress photo.");

    const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
    const [source] = await db
      .select()
      .from(progressPhotos)
      .where(eq(progressPhotos.id, photoId))
      .limit(1);
    if (!review || !source) return notFound();

    const bytes = await progressPhotoStore().get(source.blobKey, { type: "arrayBuffer" });
    if (!bytes) return notFound();

    const blobKey = newBlobKey(`review-${reviewId}`);
    await reviewPhotoStore().set(blobKey, bytes);
    const [photo] = await db
      .insert(reviewPhotos)
      .values({
        reviewId,
        blobKey,
        contentType: source.contentType,
        label: text(body.label, 40),
        position: Number.parseInt(String(body.position ?? 0), 10) || 0,
      })
      .returning();

    return json(
      { photo: { id: photo.id, url: `/api/review-photos/${photo.id}`, label: photo.label } },
      201,
    );
  }

  /* ------------------------------------------------------------ /overview */
  if (resource === "overview" && method === "GET") {
    const [[clientTotal], [photoTotal], [visitTotal], [orderTotal], [reviewTotal]] =
      await Promise.all([
        db.select({ total: count() }).from(clients),
        db.select({ total: count() }).from(progressPhotos),
        db.select({ total: count() }).from(appointments),
        db.select({ total: count() }).from(orders),
        db.select({ total: count() }).from(reviews),
      ]);

    const pending = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "pending"))
      .orderBy(desc(orders.id))
      .limit(10);

    return json({
      totals: {
        clients: Number(clientTotal.total),
        photos: Number(photoTotal.total),
        appointments: Number(visitTotal.total),
        orders: Number(orderTotal.total),
        reviews: Number(reviewTotal.total),
      },
      pendingOrders: pending,
    });
  }

  return notFound();
};

export const config: Config = {
  path: "/api/admin/*",
};
