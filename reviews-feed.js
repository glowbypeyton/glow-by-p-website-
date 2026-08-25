/* ===========================================================
   Renders published testimonials (and any before/after photos
   attached in the admin portal) into [data-reviews-feed].
=========================================================== */
document.addEventListener('DOMContentLoaded', function () {
  var feeds = document.querySelectorAll('[data-reviews-feed]');
  if (!feeds.length) return;

  function esc (value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function card (review) {
    var stars = new Array(Math.max(1, Math.min(5, review.rating || 5)) + 1).join('★');
    var photos = (review.photos || []).slice(0, 3);
    return '<div class="review-card">' +
      '<div class="review-stars">' + stars + '</div>' +
      (review.service ? '<span class="review-service">' + esc(review.service) + '</span>' : '') +
      '<p class="review-quote">&ldquo;' + esc(review.quote) + '&rdquo;</p>' +
      '<div class="review-name">' + esc(review.displayName) + '</div>' +
      (photos.length
        ? '<div class="review-photos">' + photos.map(function (photo) {
            return '<figure><img src="' + esc(photo.url) + '" alt="' +
              esc(review.displayName + ' progress photo') + '" loading="lazy">' +
              (photo.label ? '<figcaption>' + esc(photo.label) + '</figcaption>' : '') +
              '</figure>';
          }).join('') + '</div>'
        : '') +
      '</div>';
  }

  fetch('/api/reviews', { headers: { 'Accept': 'application/json' } })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      var reviews = (data && data.reviews) || [];
      feeds.forEach(function (feed) {
        var limit = parseInt(feed.getAttribute('data-limit'), 10);
        var shown = limit > 0 ? reviews.slice(0, limit) : reviews;
        if (!shown.length) {
          feed.innerHTML = '<p class="portal-empty">Client reviews are on their way — check back soon.</p>';
          return;
        }
        feed.innerHTML = shown.map(card).join('');
      });
    })
    .catch(function () {
      feeds.forEach(function (feed) {
        feed.innerHTML = '<p class="portal-empty">Reviews could not be loaded right now.</p>';
      });
    });
});
