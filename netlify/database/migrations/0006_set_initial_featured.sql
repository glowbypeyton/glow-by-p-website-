-- 0005 added the `featured` column correctly, but its UPDATE
-- statement (setting the 4 starter products as featured) didn't take
-- effect in production for reasons that weren't visible from outside
-- the migration runner. Re-asserting it here as its own migration,
-- since a fresh filename is guaranteed to run.

UPDATE products SET featured = TRUE
WHERE slug IN ('stone-crop-cleansing-oil', 'stone-crop-hydrating-mist', 'strawberry-rhubarb-hyaluronic-serum', 'gentle-sun-cream');
