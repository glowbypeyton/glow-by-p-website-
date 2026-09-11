-- Phase 5: Orders
-- Netlify applies this automatically on deploy.
--
-- Stores a record of every completed Square payment, written by
-- square-webhook.js when Square notifies us that a payment finished.
-- Deliberately NOT written at checkout-link-creation time (in
-- create-checkout.js) — that would record abandoned carts as if they
-- were real orders. This table only gets a row once money has
-- actually moved.

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  square_order_id TEXT,
  square_payment_id TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_email TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
