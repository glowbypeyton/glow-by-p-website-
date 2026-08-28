-- Adds a "featured" flag so specific products can be picked to show
-- in the homepage "Shop Your Skincare" preview, instead of that
-- section being hard-coded (and going stale) or arbitrary.
-- Netlify applies this automatically on deploy.

ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;

-- A reasonable starting set: one cleanser, one toner/mist, one
-- serum, one SPF — mirrors the old placeholder preview's spread.
-- Change which products are featured anytime from Admin > Products.
UPDATE products SET featured = TRUE
WHERE slug IN ('stone-crop-cleansing-oil', 'stone-crop-hydrating-mist', 'strawberry-rhubarb-hyaluronic-serum', 'gentle-sun-cream');
