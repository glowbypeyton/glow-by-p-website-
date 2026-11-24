-- Gift cards are now sold through Backbar (https://backbarhq.com/gift/glow-by-p);
-- the shop shows a "Buy a Gift Card" link instead of a price/cart button.
-- Applied once on deploy.
UPDATE products
SET description = 'Redeemable for treatments or skincare. Purchased through our booking site.',
    price_label = NULL
WHERE slug = 'gift-card';
