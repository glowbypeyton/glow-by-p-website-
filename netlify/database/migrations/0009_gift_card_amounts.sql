-- Gift cards now come in set amounts picked from a dropdown
-- (script.js + create-checkout.js GIFT_CARD_AMOUNTS), so the old
-- "$15 – $500" / "in any amount" wording no longer fits.
-- Netlify applies this automatically on deploy (once).
UPDATE products
SET description = 'Redeemable for treatments or skincare. Choose $25, $50, $100 or $150.',
    price_label = '$25 – $150'
WHERE slug = 'gift-card';
