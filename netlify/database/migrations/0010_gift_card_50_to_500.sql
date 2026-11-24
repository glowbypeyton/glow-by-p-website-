-- Gift card amounts widened to $50 – $500 (see GIFT_CARD_AMOUNTS in
-- script.js and create-checkout.js). Applied once on deploy.
UPDATE products
SET description = 'Redeemable for treatments or skincare. Choose any amount from $50 to $500.',
    price_label = '$50 – $500'
WHERE slug = 'gift-card';
