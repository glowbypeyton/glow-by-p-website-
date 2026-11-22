/**
 * lib/sale.js
 * ---------------------------------------------------------------
 * The ONE place to set up a store-wide sale. Used by:
 *   get-products.js   — sends sale prices to the shop pages
 *   create-checkout.js — applies the discount in Square
 *
 * The sale turns itself on at `start` and off at `end` — nothing
 * needs to be changed on the site when it begins or ends. To run a
 * new sale later, just edit these values.
 *
 * Times are Pacific (-08:00 in winter, -07:00 in summer).
 * ------------------------------------------------------------- */

const SALE = {
  name: 'Black Friday Sale',
  percent: 15,
  start: '2026-11-27T00:00:00-08:00', // Black Friday, midnight
  end: '2026-12-01T00:00:00-08:00',   // right after Cyber Monday ends
  // Categories NOT discounted. (Facials are booked on Backbar, so
  // they are never part of a website sale anyway.)
  excludeCategories: ['gifts']
};

function isSaleActive(now) {
  const t = (now || new Date()).getTime();
  return t >= Date.parse(SALE.start) && t < Date.parse(SALE.end);
}

function appliesTo(product) {
  return !!product && SALE.excludeCategories.indexOf(product.category) === -1;
}

// e.g. $52 at 15% off -> 44.2
function salePrice(price) {
  return Math.round(Number(price) * (100 - SALE.percent)) / 100;
}

module.exports = { SALE, isSaleActive, appliesTo, salePrice };
