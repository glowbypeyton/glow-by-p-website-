-- Give the gift card a photo (it had none, so the shop showed a
-- "Photo placeholder" box). Applied once on deploy.
UPDATE products
SET image_url = 'images/gift-shelf.jpg'
WHERE slug = 'gift-card';
