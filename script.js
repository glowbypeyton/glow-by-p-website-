document.addEventListener('DOMContentLoaded', function () {

  /* ---------------- Mobile nav ---------------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  var scrim = document.querySelector('.nav-scrim');

  function closeNav () {
    if (!toggle) return;
    toggle.classList.remove('open');
    links.classList.remove('open');
    scrim.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  function toggleNav () {
    var isOpen = links.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    scrim.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
  if (toggle && links) {
    toggle.addEventListener('click', toggleNav);
    scrim.addEventListener('click', closeNav);
    links.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeNav); });
  }

  /* ---------------- Scroll reveal ---------------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------------- FAQ accordion ---------------- */
  document.querySelectorAll('.faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var wasOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.faq-item.open').forEach(function (i) { i.classList.remove('open'); });
      if (!wasOpen) item.classList.add('open');
    });
  });

  /* =========================================================
     SQUARE CHECKOUT — combined multi-item checkout.
     Calls a Netlify serverless function (netlify/functions/
     create-checkout.js) that builds ONE Square checkout link
     covering every item passed to it. That function needs your
     Square Access Token and Location ID set as environment
     variables in Netlify — see README.md for setup steps.
  ========================================================= */
  function goToSquareCheckout (items, triggerBtn) {
    var originalText = triggerBtn ? triggerBtn.textContent : null;
    if (triggerBtn) { triggerBtn.disabled = true; triggerBtn.textContent = 'Connecting to Square…'; }

    fetch('/.netlify/functions/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: items })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (result.ok && result.data.url) {
          window.location.href = result.data.url;
        } else {
          alert((result.data && result.data.error) || 'Checkout could not be started. Please try again.');
          if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.textContent = originalText; }
        }
      })
      .catch(function () {
        alert('Could not reach checkout. Please check your connection and try again.');
        if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.textContent = originalText; }
      });
  }

  /* ---------------- Newsletter signup (real, saves to database) ---------------- */
  var newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('newsletterBtn');
      var msg = document.getElementById('newsletterMsg');
      var firstName = document.getElementById('nFirstName').value.trim();
      var email = document.getElementById('nEmail').value.trim();
      btn.disabled = true;
      btn.textContent = 'Sending…';

      fetch('/.netlify/functions/submit-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: firstName, email: email })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          btn.disabled = false;
          btn.textContent = 'Send Me the Glow Note';
          if (result.ok) {
            newsletterForm.reset();
            msg.textContent = (firstName ? firstName + ', y' : 'Y') + "ou're on the list — welcome to the Glow Note.";
          } else {
            msg.textContent = (result.data && result.data.error) || 'Something went wrong. Please try again.';
          }
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = 'Send Me the Glow Note';
          msg.textContent = 'Could not reach the server. Please try again.';
        });
    });
  }

  /* ---------------- Contact form (real, saves to database) ---------------- */
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('contactBtn');
      var msg = document.getElementById('contactMsg');
      var payload = {
        name: document.getElementById('cname').value.trim(),
        email: document.getElementById('cemail').value.trim(),
        phone: document.getElementById('cphone').value.trim(),
        service: document.getElementById('cservice').value,
        message: document.getElementById('cmessage').value.trim()
      };
      btn.disabled = true;
      btn.textContent = 'Sending…';

      fetch('/.netlify/functions/submit-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          btn.disabled = false;
          btn.textContent = 'Send Message';
          if (result.ok) {
            contactForm.reset();
            msg.textContent = 'Thank you — your message has been sent. Peyton will reply within 1–2 business days.';
          } else {
            msg.textContent = (result.data && result.data.error) || 'Something went wrong. Please try again.';
          }
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = 'Send Message';
          msg.textContent = 'Could not reach the server. Please try again.';
        });
    });
  }

  /* ---------------- Booking-page demo forms (FAQ page etc, unchanged) ---------------- */
  document.querySelectorAll('[data-demo-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = form.querySelector('[data-form-msg]');
      form.reset();
      if (msg) { msg.textContent = msg.getAttribute('data-success') || 'Thank you — your message has been sent.'; msg.classList.add('in'); }
    });
  });

  /* =========================================================
     CART — placeholder client-side cart stored in localStorage.
     This is a DEMO implementation so the shop pages are fully
     interactive before a real commerce backend (e.g. Shopify,
     Square, an affiliate storefront) is connected. Swap
     addToCart()/renderCart() for real checkout calls when
     ready — every button already carries data-product
     attributes needed to wire that up.
  ========================================================= */
  var CART_KEY = 'glowbyp_cart_demo';

  function getCart () {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCart (cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  }
  function addToCart (product) {
    var cart = getCart();
    var existing = cart.find(function (i) { return i.id === product.id; });
    if (existing) { existing.qty += 1; } else { cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 }); }
    saveCart(cart);
  }
  function removeFromCart (id) {
    saveCart(getCart().filter(function (i) { return i.id !== id; }));
  }
  function updateQty (id, qty) {
    var cart = getCart();
    var item = cart.find(function (i) { return i.id === id; });
    if (item) { item.qty = Math.max(1, qty); }
    saveCart(cart);
  }
  function cartCount () {
    return getCart().reduce(function (sum, i) { return sum + i.qty; }, 0);
  }
  function updateCartCount () {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      var count = cartCount();
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }
  updateCartCount();

  /* =========================================================
     STOCK — set the number of units you have for each product
     right on the button: data-stock="4". The site reads that
     number and shows "Only X left" / "Sold Out" automatically.
     This is a manual counter, not connected to a live inventory
     system — update the number in the HTML whenever your real
     stock changes (a sale in the studio, a restock, etc). See
     README.md for exactly where to edit this per product.
  ========================================================= */
  function initStockDisplays () {
    document.querySelectorAll('[data-add-to-cart], [data-buy-now]').forEach(function (btn) {
      var stockAttr = btn.getAttribute('data-stock');
      if (stockAttr === null) return; // no stock tracking set for this button
      var stock = parseInt(stockAttr, 10);
      var targetId = btn.getAttribute('data-stock-target');
      var note;

      if (targetId) {
        note = document.getElementById(targetId);
      } else {
        var card = btn.closest('.product-card');
        var noteHost = card ? card.querySelector('.product-body') : btn.parentElement;
        note = noteHost.querySelector('.stock-note');
        if (!note) {
          note = document.createElement('span');
          note.className = 'stock-note';
          var priceEl = noteHost.querySelector('.product-price');
          if (priceEl) { priceEl.insertAdjacentElement('afterend', note); }
          else { noteHost.appendChild(note); }
        }
      }

      if (stock <= 0) {
        note.textContent = 'Sold Out';
        note.className = 'stock-note out';
        btn.disabled = true;
        btn.textContent = 'Sold Out';
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        var cardEl = btn.closest('.product-card');
        if (cardEl) cardEl.classList.add('sold-out');
      } else if (stock <= 5) {
        note.textContent = 'Only ' + stock + ' left';
        note.className = 'stock-note low';
      } else {
        note.textContent = '';
        note.className = 'stock-note in';
      }
    });
  }
  initStockDisplays();

  document.querySelectorAll('[data-add-to-cart]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      addToCart({
        id: btn.getAttribute('data-product-id'),
        name: btn.getAttribute('data-product-name'),
        price: parseFloat(btn.getAttribute('data-product-price')) || 0
      });
      var label = btn.getAttribute('data-label-default');
      btn.textContent = 'Added ✓';
      setTimeout(function () { btn.textContent = label || 'Add to Cart'; }, 1400);
    });
    btn.setAttribute('data-label-default', btn.textContent);
  });

  document.querySelectorAll('[data-buy-now]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      goToSquareCheckout([{
        id: btn.getAttribute('data-product-id'),
        name: btn.getAttribute('data-product-name'),
        price: parseFloat(btn.getAttribute('data-product-price')) || 0,
        qty: 1
      }], btn);
    });
  });

  /* ---------------- Cart page render ---------------- */
  var cartRoot = document.querySelector('[data-cart-root]');
  if (cartRoot) {
    renderCartPage();
  }

  function renderCartPage () {
    var cart = getCart();
    var listEl = cartRoot.querySelector('[data-cart-list]');
    var emptyEl = cartRoot.querySelector('[data-cart-empty]');
    var totalEl = cartRoot.querySelector('[data-cart-total]');
    var checkoutBtn = cartRoot.querySelector('[data-checkout]');
    listEl.innerHTML = '';

    if (!cart.length) {
      emptyEl.style.display = 'block';
      listEl.style.display = 'none';
      totalEl.textContent = '$0.00';
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      return;
    }
    emptyEl.style.display = 'none';
    listEl.style.display = 'block';
    if (checkoutBtn) checkoutBtn.style.display = '';

    var total = 0;
    cart.forEach(function (item) {
      total += item.price * item.qty;
      var row = document.createElement('div');
      row.className = 'svc-card';
      row.style.alignItems = 'center';
      row.innerHTML =
        '<div>' +
          '<div class="svc-name-row"><h3 class="h-md">' + item.name + '</h3></div>' +
          '<div class="svc-meta">$' + item.price.toFixed(2) + ' each</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">' +
          '<input type="number" min="1" value="' + item.qty + '" data-qty-input="' + item.id + '" style="width:60px;padding:8px;border:1px solid var(--line);text-align:center;border-radius:8px;">' +
          '<span class="svc-price">$' + (item.price * item.qty).toFixed(2) + '</span>' +
          '<button class="btn btn-line btn-sm" data-remove="' + item.id + '">Remove</button>' +
        '</div>';
      listEl.appendChild(row);
    });
    totalEl.textContent = '$' + total.toFixed(2);

    listEl.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () { removeFromCart(b.getAttribute('data-remove')); renderCartPage(); });
    });
    listEl.querySelectorAll('[data-qty-input]').forEach(function (inp) {
      inp.addEventListener('change', function () { updateQty(inp.getAttribute('data-qty-input'), parseInt(inp.value, 10) || 1); renderCartPage(); });
    });
    if (checkoutBtn) {
      checkoutBtn.onclick = function () { goToSquareCheckout(getCart(), checkoutBtn); };
    }
  }
});
