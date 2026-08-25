/**
 * Client portal API — everything here is scoped to the signed-in client's own
 * record. The client id always comes from the Identity session, never from the
 * request body, so one client can never read another's data.
 */
import type { Config } from "@netlify/functions";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  appointments,
  clients,
  orderItems,
  orders,
  progressPhotos,
  routineItems,
} from "../../db/schema.js";
import {
  badRequest,
  cents,
  decodeImageDataUrl,
  ensureClient,
  fail,
  getSession,
  isoDate,
  json,
  newBlobKey,
  notFound,
  progressPhotoStore,
  text,
  toId,
  unauthorized,
} from "../../lib/portal.js";

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Groups routine steps into the three parts of a routine. */
function groupRoutine(items: Array<typeof routineItems.$inferSelect>) {
  const grouped: Record<string, typeof items> = { am: [], pm: [], weekly: [] };
  for (const item of items) {
    (grouped[item.phase] || grouped.am).push(item);
  }
  return grouped;
}

async function overview(clientId: number) {
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) return notFound();

  const [routine, photos, visits, purchases] = await Promise.all([
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
  ]);

  const orderIds = purchases.map((order) => order.id);
  const items = orderIds.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
    : [];

  return json({
    profile: {
      email: client.email,
      fullName: client.fullName,
      phone: client.phone,
      skinType: client.skinType,
      concerns: client.concerns,
      memberSince: client.createdAt,
    },
    routineNote: client.routineNote,
    routine: groupRoutine(routine),
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
  });
}

export default async (req: Request, context: { params: { section?: string; id?: string } }) => {
  const session = await getSession();
  if (!session) return unauthorized();

  const client = await ensureClient(session.user);
  const section = context.params.section || "";
  const id = toId(context.params.id);

  /* ------------------------------------------------------------- overview */
  if (section === "overview" && req.method === "GET") {
    return overview(client.id);
  }

  /* -------------------------------------------------------------- profile */
  if (section === "profile" && req.method === "PUT") {
    const body = await readBody(req);
    await db
      .update(clients)
      .set({
        fullName: text(body.fullName, 120),
        phone: text(body.phone, 40),
        skinType: text(body.skinType, 80),
        concerns: text(body.concerns, 600),
        updatedAt: new Date(),
      })
      .where(eq(clients.id, client.id));
    return json({ saved: true });
  }

  /* --------------------------------------------------------------- photos */
  if (section === "photos" && req.method === "POST") {
    const body = await readBody(req);
    const image = decodeImageDataUrl(body.image);
    if (!image) {
      return badRequest("Please choose a JPEG, PNG or WebP photo under 4MB.");
    }

    const blobKey = newBlobKey(`client-${client.id}`);
    await progressPhotoStore().set(blobKey, image.bytes);

    const [photo] = await db
      .insert(progressPhotos)
      .values({
        clientId: client.id,
        blobKey,
        contentType: image.contentType,
        caption: text(body.caption, 240),
        takenOn: isoDate(body.takenOn),
        uploadedBy: "client",
      })
      .returning();

    return json({
      photo: {
        id: photo.id,
        url: `/api/photos/${photo.id}`,
        caption: photo.caption,
        takenOn: photo.takenOn,
        uploadedBy: photo.uploadedBy,
      },
    }, 201);
  }

  if (section === "photos" && req.method === "DELETE" && id) {
    // Clients may remove photos they uploaded themselves; studio photos stay.
    const [photo] = await db
      .select()
      .from(progressPhotos)
      .where(and(eq(progressPhotos.id, id), eq(progressPhotos.clientId, client.id)))
      .limit(1);
    if (!photo) return notFound();
    if (photo.uploadedBy !== "client") {
      return fail("Photos added by the studio can only be removed by Peyton.", 403);
    }

    await progressPhotoStore().delete(photo.blobKey);
    await db.delete(progressPhotos).where(eq(progressPhotos.id, photo.id));
    return json({ deleted: true });
  }

  /* --------------------------------------------------------------- orders */
  if (section === "orders" && req.method === "POST") {
    // Called when a signed-in client sends their cart to Square checkout, so
    // the order shows up in their portal and in the studio's admin view.
    const body = await readBody(req);
    const cart = Array.isArray(body.cart) ? body.cart : [];
    if (!cart.length) return badRequest("There is nothing in the cart.");

    const lines = cart.slice(0, 40).map((entry) => {
      const item = (entry || {}) as Record<string, unknown>;
      const qty = Math.min(Math.max(Number.parseInt(String(item.qty ?? 1), 10) || 1, 1), 99);
      return {
        productName: text(item.name, 200) || "Skincare item",
        qty,
        unitPriceCents: cents(item.price),
      };
    });

    const totalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.qty, 0);
    const [order] = await db
      .insert(orders)
      .values({
        clientId: client.id,
        orderRef: text(body.orderRef, 60),
        placedOn: isoDate(undefined),
        totalCents,
        status: "pending",
      })
      .returning();

    await db.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));
    return json({ orderId: order.id }, 201);
  }

  return fail("That portal route does not exist.", 400);
};

export const config: Config = {
  path: ["/api/portal/:section", "/api/portal/:section/:id"],
};
