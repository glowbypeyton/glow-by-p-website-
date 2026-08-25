import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * Clients — one row per Netlify Identity user who signs up on the site.
 * `identityId` is the Identity user id, which is what every request is
 * authorised against. Admin-only fields are marked below and are never
 * included in the client-facing payloads.
 */
export const clients = pgTable(
  "clients",
  {
    id: serial().primaryKey(),
    identityId: text("identity_id").notNull(),
    email: text().notNull(),
    fullName: text("full_name").default(""),
    phone: text().default(""),
    skinType: text("skin_type").default(""),
    concerns: text().default(""),
    // Intro note shown above the routine in the client portal
    routineNote: text("routine_note").default(""),
    // Admin only — never sent to the client
    adminNotes: text("admin_notes").default(""),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [uniqueIndex("clients_identity_id_idx").on(table.identityId)],
);

/** One step of a client's skincare routine. */
export const routineItems = pgTable(
  "routine_items",
  {
    id: serial().primaryKey(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    // "am" | "pm" | "weekly"
    phase: text().notNull().default("am"),
    position: integer().notNull().default(0),
    productName: text("product_name").notNull(),
    howToUse: text("how_to_use").default(""),
    productUrl: text("product_url").default(""),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("routine_items_client_idx").on(table.clientId)],
);

/** Progress photos. Image bytes live in Netlify Blobs under `blobKey`. */
export const progressPhotos = pgTable(
  "progress_photos",
  {
    id: serial().primaryKey(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    blobKey: text("blob_key").notNull(),
    contentType: text("content_type").notNull().default("image/jpeg"),
    caption: text().default(""),
    takenOn: text("taken_on").default(""),
    // "client" | "admin"
    uploadedBy: text("uploaded_by").notNull().default("admin"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("progress_photos_client_idx").on(table.clientId)],
);

/** Past appointments, logged by the studio after each visit. */
export const appointments = pgTable(
  "appointments",
  {
    id: serial().primaryKey(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    serviceName: text("service_name").notNull(),
    visitedOn: text("visited_on").notNull(),
    // "completed" | "upcoming" | "cancelled"
    status: text().notNull().default("completed"),
    notes: text().default(""),
    priceCents: integer("price_cents"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("appointments_client_idx").on(table.clientId)],
);

/** Skincare orders placed through the shop, or logged by the studio. */
export const orders = pgTable(
  "orders",
  {
    id: serial().primaryKey(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    orderRef: text("order_ref").default(""),
    placedOn: text("placed_on").notNull(),
    totalCents: integer("total_cents").notNull().default(0),
    // "pending" | "paid" | "shipped" | "picked-up" | "cancelled"
    status: text().notNull().default("pending"),
    notes: text().default(""),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("orders_client_idx").on(table.clientId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial().primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productName: text("product_name").notNull(),
    qty: integer().notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull().default(0),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

/** Testimonials shown on the Client Love page, managed from the admin portal. */
export const reviews = pgTable("reviews", {
  id: serial().primaryKey(),
  clientId: integer("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  displayName: text("display_name").notNull(),
  rating: integer().notNull().default(5),
  service: text().default(""),
  quote: text().notNull(),
  isPublished: boolean("is_published").notNull().default(true),
  position: integer().notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Before/after photos attached to a published testimonial. */
export const reviewPhotos = pgTable(
  "review_photos",
  {
    id: serial().primaryKey(),
    reviewId: integer("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    blobKey: text("blob_key").notNull(),
    contentType: text("content_type").notNull().default("image/jpeg"),
    label: text().default(""),
    position: integer().notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("review_photos_review_idx").on(table.reviewId)],
);
