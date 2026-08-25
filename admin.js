/* ===========================================================
   STUDIO ADMIN PORTAL
   Every client who has made an account, their routine, progress
   photos, visit history, skincare orders — plus the testimonials
   and the photos attached to them.
=========================================================== */
document.addEventListener('DOMContentLoaded', function () {
  var P = window.GlowPortal;
  if (!P || !document.getElementById('adminView')) return;

  var el = function (id) { return document.getElementById(id); };
  var loading = el('adminLoading');
  var authView = el('adminAuth');
  var adminView = el('adminView');
  var msg = el('adminMsg');

  var state = { clients: [], reviews: [], selectedId: null, detail: null, galleryCache: {} };

  /* ================================================= helpers */
  function fail (error) { P.message(msg, error.message || String(error), 'error'); }
  function ok (text) { P.message(msg, text, 'ok'); }

  function money (value) { return P.money(value); }

  function statusOptions (list, current) {
    return list.map(function (value) {
      return '<option value="' + value + '"' + (value === current ? ' selected' : '') + '>' + value + '</option>';
    }).join('');
  }

  /* ================================================= boot */
  P.api('/api/auth/me').then(function (session) {
    if (session.signedIn && session.isAdmin) return start(session);
    loading.classList.add('hidden');
    authView.classList.remove('hidden');
    if (session.signedIn && !session.isAdmin) {
      P.message(el('adminAuthMsg'), 'That account does not have studio access. Sign in with your studio email.', 'error');
    }
  }).catch(function () {
    loading.classList.add('hidden');
    authView.classList.remove('hidden');
  });

  function start (session) {
    loading.classList.add('hidden');
    authView.classList.add('hidden');
    adminView.classList.remove('hidden');
    el('adminWho').textContent = 'Signed in as ' + (session.email || '');
    loadOverview();
    loadClients();
    loadReviews();
  }

  el('adminSignInForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var button = this.querySelector('button[type="submit"]');
    P.busy(button, true, 'Signing in…');
    P.api('/api/auth/login', {
      method: 'POST',
      body: { email: el('adminEmail').value, password: el('adminPassword').value }
    }).then(function (data) {
      if (data.session && data.session.isAdmin) return start(data.session);
      P.message(el('adminAuthMsg'), 'That account does not have studio access.', 'error');
    }).catch(function (error) {
      P.message(el('adminAuthMsg'), error.message, 'error');
    }).finally(function () { P.busy(button, false); });
  });

  el('adminSignOut').addEventListener('click', function () {
    P.api('/api/auth/logout', { method: 'POST' }).finally(function () {
      window.location.href = 'index.html';
    });
  });

  document.querySelectorAll('[data-admin-tab]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var name = tab.getAttribute('data-admin-tab');
      document.querySelectorAll('[data-admin-tab]').forEach(function (other) {
        other.setAttribute('aria-selected', other === tab ? 'true' : 'false');
      });
      document.querySelectorAll('[data-admin-panel]').forEach(function (panel) {
        panel.classList.toggle('hidden', panel.getAttribute('data-admin-panel') !== name);
      });
    });
  });

  /* ================================================= overview */
  function loadOverview () {
    P.api('/api/admin/overview').then(function (data) {
      var totals = data.totals || {};
      el('statRow').innerHTML =
        stat(totals.clients, 'Client accounts') +
        stat(totals.appointments, 'Visits logged') +
        stat(totals.orders, 'Skincare orders') +
        stat(totals.photos, 'Progress photos') +
        stat(totals.reviews, 'Testimonials');
    }).catch(fail);
  }

  function stat (value, label) {
    return '<div class="stat"><b>' + (Number(value) || 0) + '</b><span>' + label + '</span></div>';
  }

  /* ================================================= client list */
  function loadClients () {
    return P.api('/api/admin/clients').then(function (data) {
      state.clients = data.clients || [];
      renderClientList();
    }).catch(fail);
  }

  function renderClientList () {
    var term = (el('clientSearch').value || '').toLowerCase();
    var rows = state.clients.filter(function (client) {
      if (!term) return true;
      return ((client.fullName || '') + ' ' + client.email).toLowerCase().indexOf(term) > -1;
    });

    if (!rows.length) {
      el('clientList').innerHTML = '<p class="portal-empty">' +
        (state.clients.length ? 'No clients match that search.' : 'No client accounts yet. Clients create their own account on the client portal page.') +
        '</p>';
      return;
    }

    el('clientList').innerHTML = rows.map(function (client) {
      return '<button type="button" class="client-btn" data-client="' + client.id + '"' +
        (state.selectedId === client.id ? ' aria-current="true"' : '') + '>' +
        '<strong>' + P.esc(client.fullName || 'New client') + '</strong>' +
        '<small>' + P.esc(client.email) + '</small>' +
        '<span class="counts">' + client.photoCount + ' photos · ' + client.appointmentCount +
        ' visits · ' + client.orderCount + ' orders</span></button>';
    }).join('');
  }

  el('clientSearch').addEventListener('input', renderClientList);

  el('clientList').addEventListener('click', function (event) {
    var button = event.target.closest('[data-client]');
    if (!button) return;
    state.selectedId = Number(button.getAttribute('data-client'));
    renderClientList();
    loadClient(state.selectedId);
  });

  /* ================================================= client detail */
  function loadClient (id) {
    el('clientDetail').innerHTML = '<div class="panel"><p class="portal-loading">Loading client…</p></div>';
    return P.api('/api/admin/clients/' + id).then(function (data) {
      state.detail = data;
      state.galleryCache[id] = data.photos || [];
      renderClientDetail(data);
    }).catch(fail);
  }

  function refreshClient () {
    return Promise.all([loadClient(state.selectedId), loadClients(), loadOverview()]);
  }

  function routineRow (item, index) {
    var phases = ['am', 'pm', 'weekly'];
    return '<div class="editor-row" data-routine-row>' +
      '<div class="field"><label>Part</label><select data-field="phase">' +
        phases.map(function (phase) {
          var label = phase === 'am' ? 'Morning' : phase === 'pm' ? 'Evening' : 'Weekly';
          return '<option value="' + phase + '"' + (item.phase === phase ? ' selected' : '') + '>' + label + '</option>';
        }).join('') +
      '</select></div>' +
      '<div class="field"><label>Product</label><input type="text" data-field="productName" maxlength="200" value="' + P.esc(item.productName || '') + '"></div>' +
      '<div class="field"><label>How to use</label><input type="text" data-field="howToUse" maxlength="600" value="' + P.esc(item.howToUse || '') + '"></div>' +
      '<button type="button" class="icon-btn" data-remove-row aria-label="Remove step ' + (index + 1) + '">✕</button>' +
      '<div class="field" style="grid-column:1/-1;"><label>Link to reorder <span style="opacity:.6;">(optional)</span></label><input type="url" data-field="productUrl" maxlength="500" value="' + P.esc(item.productUrl || '') + '"></div>' +
      '</div>';
  }

  function renderClientDetail (data) {
    var client = data.client;
    var photos = data.photos || [];
    var visits = data.appointments || [];
    var orders = data.orders || [];

    el('clientDetail').innerHTML = [
      /* ---- profile ---- */
      '<div class="panel">',
      '  <div class="panel-head"><h2>' + P.esc(client.fullName || 'New client') + '</h2>',
      '  <span class="record-meta">' + P.esc(client.email) + '</span></div>',
      '  <form data-form="profile">',
      '    <div class="field-inline">',
      '      <div class="field"><label>Full name</label><input type="text" data-field="fullName" maxlength="120" value="' + P.esc(client.fullName || '') + '"></div>',
      '      <div class="field"><label>Phone</label><input type="tel" data-field="phone" maxlength="40" value="' + P.esc(client.phone || '') + '"></div>',
      '      <div class="field"><label>Skin type</label><input type="text" data-field="skinType" maxlength="80" value="' + P.esc(client.skinType || '') + '"></div>',
      '    </div>',
      '    <div class="field"><label>What they want to work on</label><textarea data-field="concerns" rows="2" maxlength="600">' + P.esc(client.concerns || '') + '</textarea></div>',
      '    <div class="field"><label>Private studio notes <span style="opacity:.6;">(never shown to the client)</span></label><textarea data-field="adminNotes" rows="3" maxlength="4000">' + P.esc(client.adminNotes || '') + '</textarea></div>',
      '    <button type="submit" class="btn btn-solid btn-sm">Save Client</button>',
      '  </form>',
      '</div>',

      /* ---- routine ---- */
      '<div class="panel">',
      '  <div class="panel-head"><h2>Skincare Routine</h2>',
      '  <button type="button" class="btn btn-line btn-sm" data-add-step>+ Add Step</button></div>',
      '  <form data-form="routine">',
      '    <div class="field"><label>Note at the top of their routine</label><textarea data-field="routineNote" rows="2" maxlength="1200" placeholder="Give the exfoliant two weeks before adding the retinal back in.">' + P.esc(client.routineNote || '') + '</textarea></div>',
      '    <div data-routine-rows>' + (data.routine.length ? data.routine.map(routineRow).join('') : '') + '</div>',
      (data.routine.length ? '' : '<p class="portal-empty" data-routine-empty>No steps yet — add the first one above.</p>'),
      '    <div class="btn-row"><button type="submit" class="btn btn-solid btn-sm">Save Routine</button></div>',
      '  </form>',
      '</div>',

      /* ---- photos ---- */
      '<div class="panel">',
      '  <div class="panel-head"><h2>Progress Photos</h2></div>',
      '  <form data-form="photo" class="upload-drop">',
      '    <label>Add a studio photo</label>',
      '    <input type="file" data-field="file" accept="image/*" required>',
      '    <div class="field-inline mt-16">',
      '      <div class="field"><label>Date taken</label><input type="date" data-field="takenOn" value="' + P.today() + '"></div>',
      '      <div class="field"><label>Note</label><input type="text" data-field="caption" maxlength="240" placeholder="e.g. 6 weeks in, before extraction"></div>',
      '    </div>',
      '    <button type="submit" class="btn btn-solid btn-sm">Upload Photo</button>',
      '  </form>',
      '  <div class="photo-grid mt-24">',
      (photos.length ? photos.map(function (photo) {
        return '<figure class="photo-card">' +
          '<img src="' + P.esc(photo.url) + '" alt="Progress photo" loading="lazy">' +
          '<figcaption><span class="photo-date">' + P.esc(P.prettyDate(photo.takenOn)) + '</span>' +
          P.esc(photo.caption || '') +
          '<span class="photo-tag">' + (photo.uploadedBy === 'admin' ? 'Studio' : 'Client upload') + '</span></figcaption>' +
          '<div class="row-actions"><button type="button" class="btn btn-line btn-sm" data-delete-photo="' + photo.id + '">Delete</button></div>' +
          '</figure>';
      }).join('') : '<p class="portal-empty">No photos yet.</p>'),
      '  </div>',
      '</div>',

      /* ---- appointments ---- */
      '<div class="panel">',
      '  <div class="panel-head"><h2>Appointments</h2></div>',
      '  <p class="panel-note">Log each visit after the appointment so the client sees their history. Bookings themselves still happen on GlossGenius.</p>',
      '  <form data-form="appointment">',
      '    <div class="field-inline">',
      '      <div class="field"><label>Service</label><input type="text" data-field="serviceName" maxlength="200" required placeholder="Classic Facial"></div>',
      '      <div class="field"><label>Date</label><input type="date" data-field="visitedOn" value="' + P.today() + '"></div>',
      '      <div class="field"><label>Status</label><select data-field="status">' + statusOptions(['completed', 'upcoming', 'cancelled'], 'completed') + '</select></div>',
      '      <div class="field"><label>Price</label><input type="number" data-field="price" min="0" step="0.01" placeholder="95"></div>',
      '    </div>',
      '    <div class="field"><label>Notes the client can see</label><textarea data-field="notes" rows="2" maxlength="2000"></textarea></div>',
      '    <button type="submit" class="btn btn-solid btn-sm">Add Appointment</button>',
      '  </form>',
      '  <div class="mt-24">',
      (visits.length ? visits.map(function (visit) {
        return '<div class="record"><div class="record-top"><h4>' + P.esc(visit.serviceName) + '</h4>' +
          '<span class="record-meta">' + P.esc(P.prettyDate(visit.visitedOn)) + '</span></div>' +
          '<span class="pill' + (visit.status === 'completed' ? '' : ' pill-warn') + '">' + P.esc(visit.status) + '</span>' +
          (visit.priceCents ? ' <span class="record-meta">' + money(visit.priceCents) + '</span>' : '') +
          (visit.notes ? '<p>' + P.esc(visit.notes) + '</p>' : '') +
          '<div class="row-actions"><button type="button" class="btn btn-line btn-sm" data-delete-appointment="' + visit.id + '">Delete</button></div>' +
          '</div>';
      }).join('') : '<p class="portal-empty">No visits logged yet.</p>'),
      '  </div>',
      '</div>',

      /* ---- orders ---- */
      '<div class="panel">',
      '  <div class="panel-head"><h2>Skincare Orders</h2></div>',
      '  <p class="panel-note">Shop orders placed by this client while signed in land here automatically. You can also log a studio pick-up.</p>',
      '  <form data-form="order">',
      '    <div class="field-inline">',
      '      <div class="field"><label>Product</label><input type="text" data-field="productName" maxlength="200" placeholder="Gentle Cream Cleanser"></div>',
      '      <div class="field"><label>Qty</label><input type="number" data-field="qty" min="1" max="99" value="1"></div>',
      '      <div class="field"><label>Price each</label><input type="number" data-field="price" min="0" step="0.01" placeholder="32"></div>',
      '      <div class="field"><label>Date</label><input type="date" data-field="placedOn" value="' + P.today() + '"></div>',
      '      <div class="field"><label>Status</label><select data-field="status">' + statusOptions(['paid', 'pending', 'shipped', 'picked-up', 'cancelled'], 'paid') + '</select></div>',
      '    </div>',
      '    <button type="submit" class="btn btn-solid btn-sm">Log Order</button>',
      '  </form>',
      '  <div class="mt-24">',
      (orders.length ? orders.map(function (order) {
        return '<div class="record"><div class="record-top"><h4>' + money(order.totalCents) + '</h4>' +
          '<span class="record-meta">' + P.esc(P.prettyDate(order.placedOn)) + '</span></div>' +
          '<ul>' + (order.items || []).map(function (item) {
            return '<li><span>' + P.esc(item.productName) + ' × ' + item.qty + '</span><span>' +
              money(item.unitPriceCents * item.qty) + '</span></li>';
          }).join('') + '</ul>' +
          '<div class="row-actions">' +
          '<select data-order-status="' + order.id + '">' + statusOptions(['pending', 'paid', 'shipped', 'picked-up', 'cancelled'], order.status) + '</select>' +
          '<button type="button" class="btn btn-line btn-sm" data-delete-order="' + order.id + '">Delete</button>' +
          '</div></div>';
      }).join('') : '<p class="portal-empty">No orders yet.</p>'),
      '  </div>',
      '</div>'
    ].join('\n');
  }

  /* ---- client detail events (delegated) ---- */
  el('clientDetail').addEventListener('click', function (event) {
    var target = event.target;
    var id = state.selectedId;

    if (target.closest('[data-add-step]')) {
      var rows = el('clientDetail').querySelector('[data-routine-rows]');
      var empty = el('clientDetail').querySelector('[data-routine-empty]');
      if (empty) empty.remove();
      rows.insertAdjacentHTML('beforeend', routineRow({ phase: 'am' }, rows.children.length));
      return;
    }

    if (target.closest('[data-remove-row]')) {
      target.closest('[data-routine-row]').remove();
      return;
    }

    var deletePhoto = target.closest('[data-delete-photo]');
    if (deletePhoto && window.confirm('Delete this photo?')) {
      P.api('/api/admin/photos/' + deletePhoto.getAttribute('data-delete-photo'), { method: 'DELETE' })
        .then(function () { ok('Photo deleted.'); return refreshClient(); }).catch(fail);
      return;
    }

    var deleteVisit = target.closest('[data-delete-appointment]');
    if (deleteVisit && window.confirm('Delete this appointment?')) {
      P.api('/api/admin/appointments/' + deleteVisit.getAttribute('data-delete-appointment'), { method: 'DELETE' })
        .then(function () { ok('Appointment deleted.'); return refreshClient(); }).catch(fail);
      return;
    }

    var deleteOrder = target.closest('[data-delete-order]');
    if (deleteOrder && window.confirm('Delete this order?')) {
      P.api('/api/admin/orders/' + deleteOrder.getAttribute('data-delete-order'), { method: 'DELETE' })
        .then(function () { ok('Order deleted.'); return refreshClient(); }).catch(fail);
      return;
    }

    if (!id) return;
  });

  el('clientDetail').addEventListener('change', function (event) {
    var select = event.target.closest('[data-order-status]');
    if (!select) return;
    P.api('/api/admin/orders/' + select.getAttribute('data-order-status'), {
      method: 'PUT', body: { status: select.value }
    }).then(function () { ok('Order status updated.'); }).catch(fail);
  });

  el('clientDetail').addEventListener('submit', function (event) {
    var form = event.target.closest('form');
    if (!form) return;
    event.preventDefault();

    var id = state.selectedId;
    var kind = form.getAttribute('data-form');
    var button = form.querySelector('button[type="submit"]');
    var value = function (field) {
      var input = form.querySelector('[data-field="' + field + '"]');
      return input ? input.value : '';
    };

    if (kind === 'profile') {
      P.busy(button, true);
      P.api('/api/admin/clients/' + id, {
        method: 'PUT',
        body: {
          fullName: value('fullName'), phone: value('phone'), skinType: value('skinType'),
          concerns: value('concerns'), adminNotes: value('adminNotes'),
          routineNote: state.detail.client.routineNote || ''
        }
      }).then(function () { ok('Client saved.'); return refreshClient(); })
        .catch(fail).finally(function () { P.busy(button, false); });
      return;
    }

    if (kind === 'routine') {
      var items = Array.prototype.map.call(form.querySelectorAll('[data-routine-row]'), function (row, index) {
        var read = function (field) {
          var input = row.querySelector('[data-field="' + field + '"]');
          return input ? input.value : '';
        };
        return {
          phase: read('phase'), productName: read('productName'),
          howToUse: read('howToUse'), productUrl: read('productUrl'), position: index
        };
      }).filter(function (item) { return item.productName.trim(); });

      P.busy(button, true);
      P.api('/api/admin/clients/' + id + '/routine', {
        method: 'PUT', body: { items: items, routineNote: value('routineNote') }
      }).then(function () { ok('Routine saved.'); return refreshClient(); })
        .catch(fail).finally(function () { P.busy(button, false); });
      return;
    }

    if (kind === 'photo') {
      var file = form.querySelector('[data-field="file"]').files[0];
      P.busy(button, true, 'Uploading…');
      P.fileToDataUrl(file).then(function (dataUrl) {
        return P.api('/api/admin/clients/' + id + '/photos', {
          method: 'POST',
          body: { image: dataUrl, caption: value('caption'), takenOn: value('takenOn') }
        });
      }).then(function () { ok('Photo added.'); return refreshClient(); })
        .catch(fail).finally(function () { P.busy(button, false); });
      return;
    }

    if (kind === 'appointment') {
      P.busy(button, true);
      P.api('/api/admin/clients/' + id + '/appointments', {
        method: 'POST',
        body: {
          serviceName: value('serviceName'), visitedOn: value('visitedOn'),
          status: value('status'), price: value('price'), notes: value('notes')
        }
      }).then(function () { ok('Appointment logged.'); return refreshClient(); })
        .catch(fail).finally(function () { P.busy(button, false); });
      return;
    }

    if (kind === 'order') {
      P.busy(button, true);
      P.api('/api/admin/clients/' + id + '/orders', {
        method: 'POST',
        body: {
          placedOn: value('placedOn'), status: value('status'),
          items: [{ productName: value('productName'), qty: value('qty'), price: value('price') }]
        }
      }).then(function () { ok('Order logged.'); return refreshClient(); })
        .catch(fail).finally(function () { P.busy(button, false); });
    }
  });

  /* ================================================= reviews */
  function loadReviews () {
    return P.api('/api/admin/reviews').then(function (data) {
      state.reviews = data.reviews || [];
      renderReviews();
    }).catch(fail);
  }

  function clientOptions () {
    return '<option value="">Choose a client…</option>' + state.clients.map(function (client) {
      return '<option value="' + client.id + '">' + P.esc(client.fullName || client.email) + '</option>';
    }).join('');
  }

  function renderReviews () {
    if (!state.reviews.length) {
      el('reviewList').innerHTML = '<p class="portal-empty">No testimonials yet. Add the first one above.</p>';
      return;
    }

    el('reviewList').innerHTML = state.reviews.map(function (review) {
      return '<div class="review-admin" data-review="' + review.id + '">' +
        '<form data-review-form>' +
        '  <div class="field-inline">' +
        '    <div class="field"><label>Name shown</label><input type="text" data-field="displayName" maxlength="120" value="' + P.esc(review.displayName) + '"></div>' +
        '    <div class="field"><label>Service</label><input type="text" data-field="service" maxlength="120" value="' + P.esc(review.service || '') + '"></div>' +
        '    <div class="field"><label>Stars</label><select data-field="rating">' + statusOptions(['5', '4', '3', '2', '1'], String(review.rating)) + '</select></div>' +
        '    <div class="field"><label>Order on page</label><input type="number" data-field="position" value="' + (review.position || 0) + '"></div>' +
        '    <div class="field"><label>Published</label><select data-field="isPublished">' +
        '      <option value="yes"' + (review.isPublished ? ' selected' : '') + '>Yes — live on the site</option>' +
        '      <option value="no"' + (review.isPublished ? '' : ' selected') + '>No — hidden</option>' +
        '    </select></div>' +
        '  </div>' +
        '  <div class="field"><label>Their words</label><textarea data-field="quote" rows="2" maxlength="2000">' + P.esc(review.quote) + '</textarea></div>' +
        '  <div class="row-actions">' +
        '    <button type="submit" class="btn btn-solid btn-sm">Save</button>' +
        '    <button type="button" class="btn btn-line btn-sm" data-delete-review>Delete</button>' +
        '  </div>' +
        '</form>' +

        '<div class="review-photo-strip">' +
        (review.photos || []).map(function (photo) {
          return '<figure><img src="' + P.esc(photo.url) + '" alt="Review photo" loading="lazy">' +
            '<figcaption><span>' + P.esc(photo.label || 'Photo') + '</span>' +
            '<button type="button" data-delete-review-photo="' + photo.id + '">Remove</button></figcaption></figure>';
        }).join('') +
        '</div>' +

        '<form data-review-photo-form class="upload-drop mt-16">' +
        '  <label>Add a before/after photo to this review</label>' +
        '  <input type="file" data-field="file" accept="image/*">' +
        '  <div class="field-inline mt-16">' +
        '    <div class="field"><label>Label</label><input type="text" data-field="label" maxlength="40" placeholder="Before / After"></div>' +
        '    <div class="field"><label>&nbsp;</label><button type="submit" class="btn btn-solid btn-sm">Upload &amp; Attach</button></div>' +
        '  </div>' +
        '</form>' +

        '<form data-review-gallery-form>' +
        '  <p class="panel-note mt-16">…or pull one straight from a client\'s progress photos:</p>' +
        '  <div class="field-inline">' +
        '    <div class="field"><label>Client</label><select data-field="clientId">' + clientOptions() + '</select></div>' +
        '    <div class="field"><label>Their photo</label><select data-field="photoId"><option value="">Choose a client first…</option></select></div>' +
        '    <div class="field"><label>Label</label><input type="text" data-field="label" maxlength="40" placeholder="Before / After"></div>' +
        '    <div class="field"><label>&nbsp;</label><button type="submit" class="btn btn-line btn-sm">Attach Photo</button></div>' +
        '  </div>' +
        '</form>' +
        '</div>';
    }).join('');
  }

  el('reviewCreateForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var button = this.querySelector('button[type="submit"]');
    P.busy(button, true);
    P.api('/api/admin/reviews', {
      method: 'POST',
      body: {
        displayName: el('reviewName').value, service: el('reviewService').value,
        rating: el('reviewRating').value, quote: el('reviewQuote').value
      }
    }).then(function () {
      el('reviewCreateForm').reset();
      ok('Testimonial added — it is live on the Client Love page.');
      return Promise.all([loadReviews(), loadOverview()]);
    }).catch(fail).finally(function () { P.busy(button, false); });
  });

  el('reviewList').addEventListener('click', function (event) {
    var wrapper = event.target.closest('[data-review]');
    if (!wrapper) return;
    var reviewId = wrapper.getAttribute('data-review');

    if (event.target.closest('[data-delete-review]')) {
      if (!window.confirm('Delete this testimonial and its photos?')) return;
      P.api('/api/admin/reviews/' + reviewId, { method: 'DELETE' })
        .then(function () { ok('Testimonial deleted.'); return Promise.all([loadReviews(), loadOverview()]); })
        .catch(fail);
      return;
    }

    var removePhoto = event.target.closest('[data-delete-review-photo]');
    if (removePhoto) {
      P.api('/api/admin/review-photos/' + removePhoto.getAttribute('data-delete-review-photo'), { method: 'DELETE' })
        .then(function () { ok('Photo removed.'); return loadReviews(); })
        .catch(fail);
    }
  });

  // Populate the "their photo" list when a client is picked.
  el('reviewList').addEventListener('change', function (event) {
    var select = event.target.closest('[data-field="clientId"]');
    if (!select) return;
    var form = select.closest('form');
    var photoSelect = form.querySelector('[data-field="photoId"]');
    var clientId = select.value;
    if (!clientId) { photoSelect.innerHTML = '<option value="">Choose a client first…</option>'; return; }

    var fill = function (photos) {
      photoSelect.innerHTML = photos.length
        ? photos.map(function (photo) {
            return '<option value="' + photo.id + '">' +
              P.esc((P.prettyDate(photo.takenOn) || 'Photo') + (photo.caption ? ' — ' + photo.caption : '')) +
              '</option>';
          }).join('')
        : '<option value="">This client has no photos yet</option>';
    };

    if (state.galleryCache[clientId]) { fill(state.galleryCache[clientId]); return; }
    photoSelect.innerHTML = '<option value="">Loading…</option>';
    P.api('/api/admin/clients/' + clientId).then(function (data) {
      state.galleryCache[clientId] = data.photos || [];
      fill(state.galleryCache[clientId]);
    }).catch(fail);
  });

  el('reviewList').addEventListener('submit', function (event) {
    var form = event.target.closest('form');
    if (!form) return;
    event.preventDefault();

    var reviewId = form.closest('[data-review]').getAttribute('data-review');
    var button = form.querySelector('button[type="submit"]');
    var value = function (field) {
      var input = form.querySelector('[data-field="' + field + '"]');
      return input ? input.value : '';
    };

    if (form.hasAttribute('data-review-form')) {
      P.busy(button, true);
      P.api('/api/admin/reviews/' + reviewId, {
        method: 'PUT',
        body: {
          displayName: value('displayName'), service: value('service'), rating: value('rating'),
          quote: value('quote'), position: value('position'), isPublished: value('isPublished') === 'yes'
        }
      }).then(function () { ok('Testimonial saved.'); return loadReviews(); })
        .catch(fail).finally(function () { P.busy(button, false); });
      return;
    }

    if (form.hasAttribute('data-review-photo-form')) {
      var file = form.querySelector('[data-field="file"]').files[0];
      P.busy(button, true, 'Uploading…');
      P.fileToDataUrl(file).then(function (dataUrl) {
        return P.api('/api/admin/reviews/' + reviewId + '/photos', {
          method: 'POST', body: { image: dataUrl, label: value('label') }
        });
      }).then(function () { ok('Photo attached to the review.'); return loadReviews(); })
        .catch(fail).finally(function () { P.busy(button, false); });
      return;
    }

    if (form.hasAttribute('data-review-gallery-form')) {
      if (!value('photoId')) { fail(new Error('Pick one of that client\'s photos first.')); return; }
      P.busy(button, true, 'Attaching…');
      P.api('/api/admin/review-photos', {
        method: 'POST',
        body: { reviewId: reviewId, photoId: value('photoId'), label: value('label') }
      }).then(function () { ok('Photo attached to the review.'); return loadReviews(); })
        .catch(fail).finally(function () { P.busy(button, false); });
    }
  });
});
