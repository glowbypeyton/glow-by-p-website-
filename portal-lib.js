/* ===========================================================
   Shared helpers for the client portal and the admin portal.
   Plain ES5-friendly browser JS — no build step, same as script.js.
=========================================================== */
window.GlowPortal = (function () {

  /* ---------------- API ---------------- */
  function api (path, options) {
    var config = options || {};
    var init = {
      method: config.method || 'GET',
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' }
    };
    if (config.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(config.body);
    }
    return fetch(path, init).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) {
          var error = new Error(data.error || 'Something went wrong. Please try again.');
          error.status = response.status;
          throw error;
        }
        return data;
      });
    });
  }

  /* ---------------- escaping ---------------- */
  function esc (value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------------- formatting ---------------- */
  function money (cents) {
    var amount = (Number(cents) || 0) / 100;
    return '$' + amount.toFixed(2).replace(/\.00$/, '');
  }

  function prettyDate (value) {
    if (!value) return '';
    var parts = String(value).slice(0, 10).split('-');
    if (parts.length !== 3) return String(value);
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function today () {
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    return now.getFullYear() + '-' + month + '-' + day;
  }

  function stars (rating) {
    var count = Math.max(1, Math.min(5, Number(rating) || 5));
    return new Array(count + 1).join('★');
  }

  /* ---------------- messages ---------------- */
  function message (element, text, kind) {
    if (!element) return;
    if (!text) { element.className = 'hidden'; element.textContent = ''; return; }
    element.className = 'portal-msg ' + (kind === 'ok' ? 'ok' : 'error');
    element.textContent = text;
  }

  /* ---------------- photo uploads ----------------
     Photos are downscaled and re-encoded in the browser so uploads stay
     small and fast, and land well inside the serverless request limit. */
  var MAX_EDGE = 1600;

  function fileToDataUrl (file) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('Please choose a photo.')); return; }
      if (!/^image\//.test(file.type)) { reject(new Error('That file is not an image.')); return; }
      if (file.size > 25 * 1024 * 1024) { reject(new Error('That photo is too large — please pick one under 25MB.')); return; }

      var loader = createImageBitmap
        ? createImageBitmap(file, { imageOrientation: 'from-image' })
        : Promise.reject(new Error('unsupported'));

      loader.then(function (bitmap) {
        var scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close && bitmap.close();
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      }).catch(function () {
        // Fallback: send the original bytes when canvas decoding is unavailable.
        var reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result)); };
        reader.onerror = function () { reject(new Error('That photo could not be read.')); };
        reader.readAsDataURL(file);
      });
    });
  }

  /* ---------------- misc ---------------- */
  function busy (button, isBusy, busyLabel) {
    if (!button) return;
    if (isBusy) {
      button.dataset.label = button.textContent;
      button.disabled = true;
      button.textContent = busyLabel || 'Saving…';
    } else {
      button.disabled = false;
      if (button.dataset.label) button.textContent = button.dataset.label;
    }
  }

  /** Reads a `#confirmation_token=...` style Identity callback out of the URL. */
  function readAuthHash () {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return null;
    var params = new URLSearchParams(hash);
    var kinds = ['confirmation_token', 'recovery_token', 'invite_token', 'email_change_token'];
    for (var i = 0; i < kinds.length; i++) {
      var token = params.get(kinds[i]);
      if (token) return { type: kinds[i], token: token };
    }
    var error = params.get('error_description') || params.get('error');
    return error ? { type: 'error', message: error.replace(/\+/g, ' ') } : null;
  }

  function clearHash () {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } else {
      window.location.hash = '';
    }
  }

  return {
    api: api,
    esc: esc,
    money: money,
    prettyDate: prettyDate,
    today: today,
    stars: stars,
    message: message,
    fileToDataUrl: fileToDataUrl,
    busy: busy,
    readAuthHash: readAuthHash,
    clearHash: clearHash
  };
})();
