-- One-time stock count, 2026-11-22.
-- Netlify applies this automatically on deploy (once).
--
-- Real on-hand counts from Peyton's inventory (Botnia + Eminence),
-- replacing the old placeholder numbers. Negative inventory counts
-- were set to 0. After this, stock drops automatically on each paid
-- online order (square-webhook.js) and can be edited by hand on the
-- admin Products page. The gift card is left unchanged.

UPDATE products AS p
SET stock = v.stock, updated_at = now()
FROM (VALUES
  -- Botnia
  ('daily-face-cream', 2),
  ('essential-enzymes', 3),
  ('eye-cream', 1),
  ('fade-serum', 3),
  ('gentle-cleanser', 2),
  ('gentle-sun-cream', 4),
  ('hydrating-serum', 3),
  ('lavender-hydrosol', 4),
  ('renewing-face-wash', 2),
  ('replenishing-facial-oil', 1),
  ('restorative-face-cream', 5),
  ('rose-water-toner', 3),
  ('toner-arnica-witch-hazel', 4),
  ('well-serum', 2),
  ('wisdom-oil', 2),
  -- Eminence
  ('ashwagandha-body-cream', 2),
  ('bamboo-age-corrective-masque', 2),
  ('bamboo-firming-fluid', 3),
  ('bright-skin-cleanser', 6),
  ('bright-skin-overnight-correcting-cream', 3),
  ('calm-skin-arnica-booster-serum', 4),
  ('calm-skin-arnica-masque', 0),
  ('calm-skin-chamomile-cleanser', 7),
  ('calm-skin-chamomile-moisturizer', 4),
  ('camellia-glow-solid-face-oil', 3),
  ('ceramide-repair-balm', 2),
  ('clear-skin-probiotic-cleanser', 7),
  ('clear-skin-probiotic-masque', 4),
  ('clear-skin-probiotic-moisturizer', 2),
  ('clear-skin-willow-bark-booster-serum', 5),
  ('copper-tripeptide-serum', 2),
  ('daily-defense-tinted-spf', 1),
  ('facial-recovery-oil', 5),
  ('firm-skin-acai-booster-serum', 6),
  ('firm-skin-acai-cleanser', 6),
  ('firm-skin-acai-moisturizer', 4),
  ('hibiscus-ultra-lift-neck-cream', 3),
  ('lemon-grass-cleanser', 2),
  ('mangosteen-daily-resurfacing-cleanser', 3),
  ('mangosteen-gel-moisturizer', 5),
  ('marine-flower-peptide-night-cream', 2),
  ('marine-flower-peptide-serum', 2),
  ('monoi-night-cream-face-neck', 2),
  ('neroli-hydrating-mist', 4),
  ('shiitake-ashwagandha-biphase-mist', 1),
  ('snow-mushroom-eye-cream', 2),
  ('soothing-chamomile-tonique', 2),
  ('stone-crop-cleansing-oil', 1),
  ('stone-crop-hydrating-mist', 3),
  ('stone-crop-fizzofoliant', 3),
  ('strawberry-rhubarb-dermafoliant', 0),
  ('strawberry-rhubarb-hyaluronic-serum', 3),
  ('strawberry-rhubarb-masque', 2),
  ('tulsi-snow-mushroom-cleansing-milk', 1)
) AS v(slug, stock)
WHERE p.slug = v.slug;
