/* ===========================================================
   CLIENT PORTAL
   Sign in / sign up, then the client's routine, progress photos,
   appointment history, skincare orders and details.
=========================================================== */
document.addEventListener('DOMContentLoaded', function () {
  var P = window.GlowPortal;
  if (!P || !document.getElementById('authView')) return;

  var el = function (id) { return document.getElementById(id); };
  var loading = el('portalLoading');
  var authView = el('authView');
  var dashView = el('dashView');
  var authMsg = el('authMsg');
  var dashMsg = el('dashMsg');
  var pendingToken = null;   // { type, token } from an email link

  /* ---------------- view switching ---------------- */
  function showAuth (form) {
    loading.classList.add('hidden');
    dashView.classList.add('hidden');
    authView.classList.remove('hidden');
    ['signInForm', 'signUpForm', 'recoverForm', 'resetForm'].forEach(function (id) {
      el(id).classList.toggle('hidden', id !== form);
    });
    var isSignUp = form === 'signUpForm';
    el('tabSignIn').setAttribute('aria-selected', isSignUp ? 'false' : 'true');
    el('tabSignUp').setAttribute('aria-selected', isSignUp ? 'true' : 'false');
  }

  function showDash () {
    loading.classList.add('hidden');
    authView.classList.add('hidden');
    dashView.classList.remove('hidden');
  }

  /* ---------------- rendering ---------------- */
  var PHASE_LABELS = { am: 'Morning', pm: 'Evening', weekly: 'Weekly Treatments' };

  function renderRoutine (data) {
    var note = el('routineNote');
    note.textContent = data.routineNote || '';
    note.classList.toggle('hidden', !data.routineNote);

    var routine = data.routine || {};
    var html = '';
    ['am', 'pm', 'weekly'].forEach(function (phase) {
      var steps = routine[phase] || [];
      if (!steps.length) return;
      html += '<div class="routine-phase"><h3>' + PHASE_LABELS[phase] + '</h3>';
      steps.forEach(function (step, index) {
        html += '<div class="routine-step">' +
          '<span class="step-no">' + (index + 1) + '</span>' +
          '<div><h4>' + P.esc(step.productName) + '</h4>' +
          (step.howToUse ? '<p>' + P.esc(step.howToUse) + '</p>' : '') +
          (step.productUrl ? '<a href="' + P.esc(step.productUrl) + '">Reorder this →</a>' : '') +
          '</div></div>';
      });
      html += '</div>';
    });

    el('routineBody').innerHTML = html ||
      '<p class="portal-empty">Peyton will add your personalised routine here after your next visit. In the meantime, keep it simple: cleanse, hydrate, protect.</p>';
  }

  function renderPhotos (photos) {
    var grid = el('photoGrid');
    if (!photos.length) {
      grid.innerHTML = '<p class="portal-empty">No progress photos yet. Add your first one above — it makes the change over a few months much easier to see.</p>';
      return;
    }
    grid.innerHTML = photos.map(function (photo) {
      return '<figure class="photo-card">' +
        '<img src="' + P.esc(photo.url) + '" alt="Progress photo' + (photo.takenOn ? ' from ' + P.esc(P.prettyDate(photo.takenOn)) : '') + '" loading="lazy">' +
        '<figcaption>' +
          '<span class="photo-date">' + P.esc(P.prettyDate(photo.takenOn)) + '</span>' +
          P.esc(photo.caption || '') +
          '<span class="photo-tag">' + (photo.uploadedBy === 'admin' ? 'Studio photo' : 'Added by you') + '</span>' +
        '</figcaption>' +
        (photo.uploadedBy === 'client'
          ? '<div class="row-actions"><button type="button" class="btn btn-line btn-sm" data-delete-photo="' + photo.id + '">Remove</button></div>'
          : '') +
        '</figure>';
    }).join('');
  }

  function renderAppointments (list) {
    var target = el('appointmentList');
    if (!list.length) {
      target.innerHTML = '<p class="portal-empty">No visits logged yet. After your first treatment, Peyton will add it here with the notes from your session.</p>';
      return;
    }
    target.innerHTML = list.map(function (visit) {
      return '<div class="record">' +
        '<div class="record-top"><h4>' + P.esc(visit.serviceName) + '</h4>' +
        '<span class="record-meta">' + P.esc(P.prettyDate(visit.visitedOn)) + '</span></div>' +
        '<span class="pill' + (visit.status === 'upcoming' ? ' pill-warn' : '') + '">' + P.esc(visit.status) + '</span>' +
        (visit.priceCents ? ' <span class="record-meta">' + P.money(visit.priceCents) + '</span>' : '') +
        (visit.notes ? '<p>' + P.esc(visit.notes) + '</p>' : '') +
        '</div>';
    }).join('');
  }

  function renderOrders (list) {
    var target = el('orderList');
    if (!list.length) {
      target.innerHTML = '<p class="portal-empty">No orders yet. Anything you order from the shop while signed in shows up here.</p>';
      return;
    }
    target.innerHTML = list.map(function (order) {
      var items = (order.items || []).map(function (item) {
        return '<li><span>' + P.esc(item.productName) + ' × ' + item.qty + '</span><span>' +
          P.money(item.unitPriceCents * item.qty) + '</span></li>';
      }).join('');
      return '<div class="record">' +
        '<div class="record-top"><h4>' + P.money(order.totalCents) + '</h4>' +
        '<span class="record-meta">' + P.esc(P.prettyDate(order.placedOn)) + '</span></div>' +
        '<span class="pill' + (order.status === 'pending' ? ' pill-warn' : '') + '">' + P.esc(order.status) + '</span>' +
        (items ? '<ul>' + items + '</ul>' : '') +
        (order.notes ? '<p>' + P.esc(order.notes) + '</p>' : '') +
        '</div>';
    }).join('');
  }

  function renderProfile (profile) {
    el('profileName').value = profile.fullName || '';
    el('profilePhone').value = profile.phone || '';
    el('profileSkinType').value = profile.skinType || '';
    el('profileConcerns').value = profile.concerns || '';
    el('profileEmail').textContent = 'Signed in as ' + (profile.email || '');
  }

  /* ---------------- data loading ---------------- */
  function loadOverview () {
    return P.api('/api/portal/overview').then(function (data) {
      renderRoutine(data);
      renderPhotos(data.photos || []);
      renderAppointments(data.appointments || []);
      renderOrders(data.orders || []);
      renderProfile(data.profile || {});

      var first = (data.profile.fullName || '').split(' ')[0];
      el('greeting').textContent = first ? 'Welcome back, ' + first + '.' : 'Welcome back.';
      if (data.profile.memberSince) {
        el('memberSince').textContent = 'Client since ' +
          new Date(data.profile.memberSince).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      }
    });
  }

  function startSession (session) {
    el('adminLink').classList.toggle('hidden', !session.isAdmin);
    showDash();
    loadOverview().catch(function (error) { P.message(dashMsg, error.message, 'error'); });
  }

  /* ---------------- boot ---------------- */
  var hashToken = P.readAuthHash();
  if (hashToken) P.clearHash();

  if (hashToken && hashToken.type === 'error') {
    showAuth('signInForm');
    P.message(authMsg, hashToken.message, 'error');
  } else if (hashToken && hashToken.type === 'confirmation_token') {
    loading.querySelector('.portal-loading').textContent = 'Confirming your email…';
    P.api('/api/auth/confirm', { method: 'POST', body: { token: hashToken.token } })
      .then(function (data) { startSession(data.session || {}); })
      .catch(function (error) {
        showAuth('signInForm');
        P.message(authMsg, error.message + ' Try signing in, or request a new link.', 'error');
      });
  } else if (hashToken && (hashToken.type === 'recovery_token' || hashToken.type === 'invite_token')) {
    pendingToken = hashToken;
    showAuth('resetForm');
    el('resetIntro').textContent = hashToken.type === 'invite_token'
      ? 'Welcome! Choose a password to finish setting up your account.'
      : 'Choose a new password for your account.';
  } else {
    P.api('/api/auth/me').then(function (session) {
      if (session.signedIn) startSession(session);
      else showAuth('signInForm');
    }).catch(function () { showAuth('signInForm'); });
  }

  /* ---------------- auth actions ---------------- */
  el('tabSignIn').addEventListener('click', function () { P.message(authMsg, ''); showAuth('signInForm'); });
  el('tabSignUp').addEventListener('click', function () { P.message(authMsg, ''); showAuth('signUpForm'); });
  el('switchToSignIn').addEventListener('click', function () { P.message(authMsg, ''); showAuth('signInForm'); });
  el('showRecover').addEventListener('click', function () { P.message(authMsg, ''); showAuth('recoverForm'); });
  el('cancelRecover').addEventListener('click', function () { P.message(authMsg, ''); showAuth('signInForm'); });

  el('signInForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var button = this.querySelector('button[type="submit"]');
    P.message(authMsg, '');
    P.busy(button, true, 'Signing in…');
    P.api('/api/auth/login', {
      method: 'POST',
      body: { email: el('signInEmail').value, password: el('signInPassword').value }
    }).then(function (data) {
      startSession(data.session || {});
    }).catch(function (error) {
      P.message(authMsg, error.message, 'error');
    }).finally(function () { P.busy(button, false); });
  });

  el('signUpForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var button = this.querySelector('button[type="submit"]');
    P.message(authMsg, '');
    P.busy(button, true, 'Creating account…');
    P.api('/api/auth/signup', {
      method: 'POST',
      body: {
        fullName: el('signUpName').value,
        email: el('signUpEmail').value,
        phone: el('signUpPhone').value,
        password: el('signUpPassword').value
      }
    }).then(function (data) {
      if (data.session && data.session.signedIn) {
        startSession(data.session);
      } else {
        showAuth('signInForm');
        P.message(authMsg, 'Account created. Check your email for a confirmation link, then sign in.', 'ok');
      }
    }).catch(function (error) {
      P.message(authMsg, error.message, 'error');
    }).finally(function () { P.busy(button, false); });
  });

  el('recoverForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var button = this.querySelector('button[type="submit"]');
    P.busy(button, true, 'Sending…');
    P.api('/api/auth/recover', { method: 'POST', body: { email: el('recoverEmail').value } })
      .then(function () {
        showAuth('signInForm');
        P.message(authMsg, 'If that email has an account, a reset link is on its way.', 'ok');
      })
      .catch(function (error) { P.message(authMsg, error.message, 'error'); })
      .finally(function () { P.busy(button, false); });
  });

  el('resetForm').addEventListener('submit', function (event) {
    event.preventDefault();
    if (!pendingToken) { P.message(authMsg, 'That link has expired. Please request a new one.', 'error'); return; }
    var button = this.querySelector('button[type="submit"]');
    var action = pendingToken.type === 'invite_token' ? 'invite' : 'reset';
    P.busy(button, true, 'Saving…');
    P.api('/api/auth/' + action, {
      method: 'POST',
      body: { token: pendingToken.token, password: el('resetPassword').value }
    }).then(function (data) {
      pendingToken = null;
      startSession(data.session || {});
    }).catch(function (error) {
      P.message(authMsg, error.message, 'error');
    }).finally(function () { P.busy(button, false); });
  });

  el('signOutBtn').addEventListener('click', function () {
    P.api('/api/auth/logout', { method: 'POST' }).finally(function () {
      window.location.href = 'portal.html';
    });
  });

  /* ---------------- dashboard tabs ---------------- */
  document.querySelectorAll('.portal-tabs button').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var name = tab.getAttribute('data-tab');
      document.querySelectorAll('.portal-tabs button').forEach(function (other) {
        other.setAttribute('aria-selected', other === tab ? 'true' : 'false');
      });
      document.querySelectorAll('[data-panel]').forEach(function (panel) {
        panel.classList.toggle('hidden', panel.getAttribute('data-panel') !== name);
      });
    });
  });

  /* ---------------- photo upload / removal ---------------- */
  el('clientPhotoDate').value = P.today();

  el('clientPhotoForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var button = this.querySelector('button[type="submit"]');
    var file = el('clientPhotoFile').files[0];
    P.message(dashMsg, '');
    P.busy(button, true, 'Uploading…');

    P.fileToDataUrl(file).then(function (dataUrl) {
      return P.api('/api/portal/photos', {
        method: 'POST',
        body: {
          image: dataUrl,
          caption: el('clientPhotoCaption').value,
          takenOn: el('clientPhotoDate').value
        }
      });
    }).then(function () {
      el('clientPhotoForm').reset();
      el('clientPhotoDate').value = P.today();
      P.message(dashMsg, 'Photo added to your progress gallery.', 'ok');
      return loadOverview();
    }).catch(function (error) {
      P.message(dashMsg, error.message, 'error');
    }).finally(function () { P.busy(button, false); });
  });

  el('photoGrid').addEventListener('click', function (event) {
    var button = event.target.closest('[data-delete-photo]');
    if (!button) return;
    if (!window.confirm('Remove this photo?')) return;
    P.api('/api/portal/photos/' + button.getAttribute('data-delete-photo'), { method: 'DELETE' })
      .then(loadOverview)
      .catch(function (error) { P.message(dashMsg, error.message, 'error'); });
  });

  /* ---------------- profile ---------------- */
  el('profileForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var button = this.querySelector('button[type="submit"]');
    P.busy(button, true);
    P.api('/api/portal/profile', {
      method: 'PUT',
      body: {
        fullName: el('profileName').value,
        phone: el('profilePhone').value,
        skinType: el('profileSkinType').value,
        concerns: el('profileConcerns').value
      }
    }).then(function () {
      P.message(dashMsg, 'Your details are saved.', 'ok');
      return loadOverview();
    }).catch(function (error) {
      P.message(dashMsg, error.message, 'error');
    }).finally(function () { P.busy(button, false); });
  });

  el('passwordForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var button = this.querySelector('button[type="submit"]');
    P.busy(button, true);
    P.api('/api/auth/password', { method: 'POST', body: { password: el('newPassword').value } })
      .then(function () {
        el('newPassword').value = '';
        P.message(dashMsg, 'Password updated.', 'ok');
      })
      .catch(function (error) { P.message(dashMsg, error.message, 'error'); })
      .finally(function () { P.busy(button, false); });
  });
});
