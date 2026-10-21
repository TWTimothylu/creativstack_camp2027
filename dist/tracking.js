import {config} from './config.js';

// Leave disabled until the owner supplies the correct advertising dataset ID.
const pixelId = String(config.metaPixelId || '');
let ready = false;
const sent = new Set();

export function initTracking() {
  if (ready || !/^\d{5,25}$/.test(pixelId)) return;
  try {
    if (!window.fbq) {
      const fbq = function (...args) {
        if (fbq.callMethod) fbq.callMethod.apply(fbq, args);
        else fbq.queue.push(args);
      };
      window.fbq = fbq;
      if (!window._fbq) window._fbq = fbq;
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }
    window.fbq('set', 'autoConfig', false, pixelId);
    window.fbq('init', pixelId);
    window.fbq('trackSingle', pixelId, 'PageView');
    ready = true;
  } catch { /* Advertising failures must never block registration. */ }
}

// Call only after the registration API has confirmed successful storage.
// No form values, names, contact details, or payment amounts are sent.
export function trackRegistrationLead(result, requestId) {
  if (!ready || result?.ok !== true || !result.registrationId || !requestId) return;
  const eventId = 'camp2027-lead-' + requestId;
  const key = 'meta:' + pixelId + ':' + eventId;
  try {
    if (sent.has(key)) return;
    try { if (sessionStorage.getItem(key)) return; } catch {}
    window.fbq('trackSingle', pixelId, 'Lead', {}, {eventID: eventId});
    sent.add(key);
    try { sessionStorage.setItem(key, '1'); } catch {}
  } catch { /* A blocked pixel must not change a successful registration. */ }
}
