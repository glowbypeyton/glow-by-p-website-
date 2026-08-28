-- Phase 3: Product catalog + admin management
-- Netlify applies this automatically on deploy.
--
-- Moves the shop from hand-edited static HTML (data-stock attributes
-- in shop.html) to a real, admin-editable product catalog. The seed
-- data below is every product live on shop.html at the time this
-- migration was written, carried over as-is (same slugs, prices,
-- descriptions, photos, and a stock count of 20 as a safe default —
-- update real counts from the admin Products page).

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_label TEXT,
  image_url TEXT NOT NULL DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category, display_order);

INSERT INTO products (slug, name, category, description, price, price_label, image_url, stock, display_order) VALUES
('gentle-cleanser', 'Gentle Cleanser', 'cleansers', 'pH-balanced gel cleanser that soothes and balances while retaining natural moisture. For dry and sensitive skin. 5 fl oz / 150 ml.', 52, NULL, 'images/products/gentle-cleanser.jpg', 20, 1),
('renewing-face-wash', 'Renewing Face Wash', 'cleansers', 'pH-balanced foaming cleanser that removes dirt and makeup while nourishing skin. For normal to wise skin. 8.45 fl oz / 250 ml.', 47, NULL, 'images/products/renewing-face-wash.jpg', 20, 2),
('bright-skin-cleanser', 'Bright Skin Cleanser', 'cleansers', 'Uneven skin corrective cleanser formulated to brighten appearance and reduce signs of aging. 8.4 oz / 250 ml.', 49, NULL, 'images/products/bright-skin-cleanser.jpg', 20, 3),
('calm-skin-chamomile-cleanser', 'Calm Skin Chamomile Cleanser', 'cleansers', 'Gentle cream cleanser infused with chamomile, arnica, and rosemary for sensitive skin prone to redness. 8.4 oz / 250 ml.', 49, NULL, 'images/products/calm-skin-chamomile-cleanser.jpg', 20, 4),
('firm-skin-acai-cleanser', 'Firm Skin Acai Cleanser', 'cleansers', 'Antioxidant-rich acai berries perfect for revitalizing mature skin. 8.4 oz / 250 ml.', 49, NULL, 'images/products/firm-skin-acai-cleanser.jpg', 20, 5),
('clear-skin-probiotic-cleanser', 'Clear Skin Probiotic Cleanser', 'cleansers', 'Clarifying cream-gel cleanser that treats oily and problem skin with cucumber and tea tree oil. 8.4 oz / 250 ml.', 49, NULL, 'images/products/clear-skin-probiotic-cleanser.jpg', 20, 6),
('tulsi-snow-mushroom-cleansing-milk', 'Tulsi & Snow Mushroom Cleansing Milk', 'cleansers', 'Uplifting milky cleanser with adaptogenic ingredients that minimizes redness and purifies without stripping skin. 5 fl oz / 150 ml.', 59, NULL, 'images/products/tulsi-snow-mushroom-cleansing-milk.jpg', 20, 7),
('stone-crop-cleansing-oil', 'Stone Crop Cleansing Oil', 'cleansers', 'Gentle, balancing facial cleanser that removes impurities while restoring skin''s natural balance. 5 oz / 150 ml.', 59, NULL, 'images/products/stone-crop-cleansing-oil.jpg', 20, 8),
('mangosteen-daily-resurfacing-cleanser', 'Mangosteen Daily Resurfacing Cleanser', 'cleansers', 'Milky gel cleanser that gently sloughs away dead skin using lactic acid and mangosteen to restore smoothness and radiance. 4.2 oz / 125 ml.', 49, NULL, 'images/products/mangosteen-daily-resurfacing-cleanser.jpg', 20, 9),
('lemon-grass-cleanser', 'Lemon Grass Cleanser', 'cleansers', 'Gentle cream cleanser with organic oils, perfect for sensitive or dehydrated skin. 1.7 oz / 50 ml.', 58, NULL, 'images/products/lemon-grass-cleanser.jpg', 20, 10),

('rose-water-toner', 'Rose Water Toner', 'toners', 'Calming rose and witch hazel toner that balances pH and supports a healthy skin microbiome. For most skin types, especially sensitive. 3.4 fl oz / 100 ml.', 46, NULL, 'images/products/rose-water-toner.png', 20, 1),
('toner-arnica-witch-hazel', 'Toner with Arnica + Witch Hazel', 'toners', 'Post-cleansing, pH-balancing elixir with antioxidant-rich arnica that decongests and hydrates. For congested, oily, and acne-prone skin. 3.4 fl oz / 100 ml.', 46, NULL, 'images/products/toner-arnica-witch-hazel.jpg', 20, 2),
('lavender-hydrosol', 'Lavender Hydrosol', 'toners', 'A calming seasonal mist for irritated, stressed, or rough skin that needs extra toning. Suitable for most skin types. 3.4 fl oz / 100 ml.', 47, NULL, 'images/products/lavender-hydrosol.jpg', 20, 3),
('neroli-hydrating-mist', 'Neroli Age Corrective Hydrating Mist', 'toners', 'Collagen-boosting toner with Natural Retinol Alternative and Swiss Green Apple Stem Cells. For all skin types, especially mature. 4.2 fl oz / 125 ml.', 39, NULL, 'images/products/neroli-hydrating-mist.jpg', 20, 4),
('stone-crop-hydrating-mist', 'Stone Crop Hydrating Mist', 'toners', 'Revitalizing and healing toner for all skin types, particularly uneven skin. 4.2 fl oz / 125 ml.', 41, NULL, 'images/products/stone-crop-hydrating-mist.jpg', 20, 5),
('soothing-chamomile-tonique', 'Soothing Chamomile Tonique', 'toners', 'Calming toner that restores skin''s balance with comforting herbs, ideal for post-peel use. 4.2 fl oz / 125 ml.', 39, NULL, 'images/products/soothing-chamomile-tonique.jpg', 20, 6),
('shiitake-ashwagandha-biphase-mist', 'Shiitake & Ashwagandha Bi-Phase Mist', 'toners', 'Dual-layer formula that shields skin from environmental stressors while restoring hydration with every spritz. 2 fl oz / 60 ml.', 48, NULL, 'images/products/shiitake-ashwagandha-biphase-mist.jpg', 20, 7),

('hydrating-serum', 'Hydrating Serum', 'serums', 'Lightweight gel serum with rose geranium and plant-derived hyaluronic acid. For dehydrated and mature skin. 1.69 fl oz / 50 ml.', 69, NULL, 'images/products/hydrating-serum.jpg', 20, 1),
('well-serum', 'Well Serum', 'serums', 'Next-generation retinoid serum that''s sun-safe, pregnancy-safe, and biome-friendly. For wise, hyperpigmented, and acne-prone skin. 1.69 fl oz / 50 ml.', 92, NULL, 'images/products/well-serum.jpg', 20, 2),
('replenishing-facial-oil', 'Replenishing Facial Oil', 'serums', 'Soothing facial oil with jojoba and lavender that protects the skin barrier without congesting pores. For most skin types. 1.69 fl oz / 50 ml.', 68, NULL, 'images/products/replenishing-facial-oil.jpg', 20, 3),
('wisdom-oil', 'Wisdom Oil', 'serums', 'Antioxidant-rich oil with sea buckthorn, rosehip, and raspberry seed to brighten and support the barrier. For wise, sun-kissed, and barrier-compromised skin. 1.69 fl oz / 50 ml.', 85, NULL, 'images/products/wisdom-oil.jpg', 20, 4),
('fade-serum', 'Fade Serum', 'serums', 'Serum with mandelic acid and algae that targets hyperpigmentation through exfoliation and melanin regulation. For wise, hyperpigmented, and acne-prone skin. 1 fl oz / 30 ml.', 84, NULL, 'images/products/fade-serum.jpg', 20, 5),
('firm-skin-acai-booster-serum', 'Firm Skin Acai Booster-Serum', 'serums', 'Antioxidant-rich extra strength serum with acai and naturally derived hyaluronic acid from marshmallow plant. 1 oz / 30 ml.', 67, NULL, 'images/products/firm-skin-acai-booster-serum.jpg', 20, 6),
('calm-skin-arnica-booster-serum', 'Calm Skin Arnica Booster-Serum', 'serums', 'Extra strength serum infused with arnica, chamomile, and lavender to calm and balance skin. 1 oz / 30 ml.', 67, NULL, 'images/products/calm-skin-arnica-booster-serum.jpg', 20, 7),
('strawberry-rhubarb-hyaluronic-serum', 'Strawberry Rhubarb Hyaluronic Serum', 'serums', 'Potent botanical hydration for a radiant, youthful-looking complexion. 1 oz / 30 ml.', 58, NULL, 'images/products/strawberry-rhubarb-hyaluronic-serum.jpg', 20, 8),
('marine-flower-peptide-serum', 'Marine Flower Peptide Serum', 'serums', 'Potent gel serum delivering concentrated plant peptides to diminish fine lines and wrinkles. 1 oz / 30 ml.', 118, NULL, 'images/products/marine-flower-peptide-serum.jpg', 20, 9),
('clear-skin-willow-bark-booster-serum', 'Clear Skin Willow Bark Booster-Serum', 'serums', 'Helps heal irritation and reduce the appearance of problem skin with willow bark and tea tree oil. 1 oz / 30 ml.', 67, NULL, 'images/products/clear-skin-willow-bark-booster-serum.jpg', 20, 10),
('copper-tripeptide-serum', 'Copper Tripeptide Serum', 'serums', 'Multi-action recovery serum that refreshes post-treatment skin with copper tripeptide, resveratrol, and zinc hyaluronate. 1 fl oz / 30 ml.', 148, NULL, 'images/products/copper-tripeptide-serum.jpg', 20, 11),
('bamboo-firming-fluid', 'Bamboo Firming Fluid', 'serums', 'A firming fluid for tighter-looking skin. 1.2 oz / 35 ml.', 72, NULL, 'images/products/bamboo-firming-fluid.jpg', 20, 12),
('facial-recovery-oil', 'Facial Recovery Oil', 'serums', 'Toning and hydrating oil with precious herbs and nourishing oils to soothe and renew sensitive and aging skin. 0.5 oz / 15 ml.', 89, NULL, 'images/products/facial-recovery-oil.jpg', 20, 13),
('camellia-glow-solid-face-oil', 'Camellia Glow Solid Face Oil', 'serums', 'Blended with luxurious camellia oil, pink tourmaline gemstones, and marula oil to soften and deeply hydrate skin. 1 oz / 30 ml.', 84, NULL, 'images/products/camellia-glow-solid-face-oil.jpg', 20, 14),

('daily-face-cream', 'Daily Face Cream', 'moisturizers', 'Lightweight everyday moisturizer with botanicals for just the right amount of hydration. For normal to dry skin. 1.69 fl oz / 50 ml.', 68, NULL, 'images/products/daily-face-cream.jpg', 20, 1),
('restorative-face-cream', 'Restorative Face Cream', 'moisturizers', 'Deeply hydrating cream that locks in moisture and plumps texture for a dewy finish. For dry or wise skin. 1.69 fl oz / 50 ml.', 75, NULL, 'images/products/restorative-face-cream.jpg', 20, 2),
('eye-cream', 'Eye Cream', 'moisturizers', 'Hyaluronic acid and plant peptides support collagen and lock in moisture around the eyes. For most skin types. 1.69 fl oz / 50 ml.', 62, NULL, 'images/products/eye-cream.jpg', 20, 3),
('monoi-night-cream-face-neck', 'Monoi Age Corrective Night Cream for Face & Neck', 'moisturizers', 'Diminish the visible signs of aging while you sleep with this deeply hydrating night cream for the face, neck, and décolletage. 2 oz / 60 ml.', 82, NULL, 'images/products/monoi-night-cream-face-neck.jpg', 20, 4),
('bright-skin-overnight-correcting-cream', 'Bright Skin Overnight Correcting Cream', 'moisturizers', 'Ultra-rich moisturizer formulated to address the look of hyperpigmentation while you sleep. 2 oz / 60 ml.', 82, NULL, 'images/products/bright-skin-overnight-correcting-cream.jpg', 20, 5),
('clear-skin-probiotic-moisturizer', 'Clear Skin Probiotic Moisturizer', 'moisturizers', 'Ultra-light daily moisturizer designed to clear problem skin appearance while minimizing clogged pores. 2 oz / 60 ml.', 69, NULL, 'images/products/clear-skin-probiotic-moisturizer.jpg', 20, 6),
('marine-flower-peptide-night-cream', 'Marine Flower Peptide Night Cream', 'moisturizers', 'Rich overnight cream formulated for delicate, crepey skin to smooth, hydrate, and minimize fine lines. 2 oz / 60 ml.', 98, NULL, 'images/products/marine-flower-peptide-night-cream.jpg', 20, 7),
('calm-skin-chamomile-moisturizer', 'Calm Skin Chamomile Moisturizer', 'moisturizers', 'Soothe irritation and hydrate sensitive skin with calming chamomile and arnica. 2 oz / 60 ml.', 69, NULL, 'images/products/calm-skin-chamomile-moisturizer.jpg', 20, 8),
('firm-skin-acai-moisturizer', 'Firm Skin Acai Moisturizer', 'moisturizers', 'Hydrate and nourish aging skin with rich shea butter and skin-plumping botanical hyaluronic acid. 2 oz / 60 ml.', 69, NULL, 'images/products/firm-skin-acai-moisturizer.jpg', 20, 9),
('mangosteen-gel-moisturizer', 'Mangosteen Gel Moisturizer', 'moisturizers', 'Lightweight gel-cream moisturizer that begins as a dewy gel and melts into skin for a smooth, matte finish. 2 oz / 60 ml.', 72, NULL, 'images/products/mangosteen-gel-moisturizer.jpg', 20, 10),
('hibiscus-ultra-lift-neck-cream', 'Hibiscus Ultra Lift Neck Cream', 'moisturizers', 'Rejuvenate and tighten the delicate neck and décolletage area with the Advanced Instant Lift fX formula. 1.7 oz / 50 ml.', 98, NULL, 'images/products/hibiscus-ultra-lift-neck-cream.jpg', 20, 11),
('ceramide-repair-balm', 'Ceramide Repair Balm', 'moisturizers', 'Comfort skin with a blend of ceramide complex, allantoin, and calendula extract for relief from dryness. 2 fl oz / 60 ml.', 74, NULL, 'images/products/ceramide-repair-balm.jpg', 20, 12),

('gentle-sun-cream', 'Gentle Sun Cream SPF 30', 'spf', 'Broad-spectrum mineral sunscreen with 18% non-nano zinc oxide, astaxanthin, and calendula that doubles as skincare. For sensitive and acne-prone skin. 1.69 fl oz / 50 ml.', 68, NULL, 'images/products/gentle-sun-cream.png', 20, 1),
('daily-defense-tinted-spf', 'Daily Defense Tinted SPF', 'spf', 'All-mineral sunscreen with antioxidants providing broad-spectrum and blue light protection. SPF 50+. 1.7 oz / 50 ml.', 66, NULL, 'images/products/daily-defense-tinted-spf.jpg', 20, 2),
('lilikoi-mineral-defense-sport-sunscreen', 'Lilikoi Mineral Defense Sport Sunscreen SPF 30', 'spf', 'Easy-to-apply sport formulation for face and body that''s water-resistant and non-greasy. SPF 30. 5 oz / 147 ml.', 52, NULL, 'images/products/lilikoi-mineral-defense-sport-sunscreen.jpg', 20, 3),

('essential-enzymes', 'Essential Enzymes', 'exfoliants', 'Multitasking cream that works as both a brightening cleanser and a gently exfoliating mask. For sensitive and acne-prone skin. 5 fl oz / 150 ml.', 55, NULL, 'images/products/essential-enzymes.jpg', 20, 1),
('strawberry-rhubarb-dermafoliant', 'Strawberry Rhubarb Dermafoliant', 'exfoliants', 'Award-winning dual-action exfoliant that gently removes impurities to reveal smooth, radiant skin. 4.2 oz / 120 g.', 62, NULL, 'images/products/strawberry-rhubarb-dermafoliant.jpg', 20, 2),
('stone-crop-fizzofoliant', 'Stone Crop Oxygenating Fizzofoliant™', 'exfoliants', 'Powder-to-foam exfoliant that gently invigorates skin and reveals a brighter complexion. 4.2 oz / 120 g.', 62, NULL, 'images/products/stone-crop-fizzofoliant.jpg', 20, 3),

('clear-skin-probiotic-masque', 'Clear Skin Probiotic Masque', 'masks', 'The clear solution to problem skin — cooling cucumber and yogurt that exfoliates and reduces blemish appearance. 2 oz / 60 ml.', 64, NULL, 'images/products/clear-skin-probiotic-masque.jpg', 20, 1),
('calm-skin-arnica-masque', 'Calm Skin Arnica Masque', 'masks', 'Naturally soothing mask that calms sensitive skin and reduces the appearance of inflammation. 2 oz / 60 ml.', 64, NULL, 'images/products/calm-skin-arnica-masque.jpg', 20, 2),
('strawberry-rhubarb-masque', 'Strawberry Rhubarb Masque', 'masks', 'Replenishing cream masque that leaves skin refreshed, plumped, and hydrated with botanical hyaluronic acid and fruit extracts. 2 oz / 60 ml.', 64, NULL, 'images/products/strawberry-rhubarb-masque.jpg', 20, 3),
('bamboo-age-corrective-masque', 'Bamboo Age Corrective Masque', 'masks', 'Age-repairing mask using advanced anti-aging technology in natural and organic skin care. 2 oz / 60 ml.', 67, NULL, 'images/products/bamboo-age-corrective-masque.jpg', 20, 4),

('snow-mushroom-eye-cream', 'Snow Mushroom Moisture Cloud Eye Cream', 'eye-care', 'Revitalize the eye area with a luxuriously fluffy eye cream that reduces puffiness and bags. 0.5 oz / 15 ml.', 83, NULL, 'images/products/snow-mushroom-eye-cream.jpg', 20, 1),

('ashwagandha-body-cream', 'Ashwagandha Ultra-Rich Restorative Cream', 'body-care', 'A calming, hydrating body cream designed for relaxation with stress-reducing botanicals. 5 fl oz / 150 ml.', 64, NULL, 'images/products/ashwagandha-body-cream.jpg', 20, 1),

('gift-card', 'Glow by P Gift Card', 'gifts', 'Redeemable for treatments or skincare, in any amount.', 50, '$25 – $200', '', 99, 1)
ON CONFLICT (slug) DO NOTHING;
