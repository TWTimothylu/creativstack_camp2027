import {config} from './config.js';

// Leave disabled until the owner supplies the correct advertising dataset ID.
const pixelId = String(config.metaPixelId || '');
let ready = false;
const sent = new Set();
const debugEnabled = typeof location !== 'undefined' && new URLSearchParams(location.search).get('meta_debug') === '1';

// Optional support diagnostics; never logs registration fields or full request URLs.
function debugTracking(stage) {
  try {
    if (!debugEnabled) return;
    const requests = performance.getEntriesByType('resource')
      .filter(r => /facebook\.com\/tr|connect\.facebook\.net/.test(r.name))
      .map(r => {
        const url = new URL(r.name);
        return {host: url.host, path: url.pathname, event: url.searchParams.get('ev'),
          status: r.responseStatus, duration: Math.round(r.duration)};
      });
    console.info('[Camp Meta diagnostics]', JSON.stringify({stage, pixelId,
      libraryReady: typeof window.fbq?.callMethod === 'function',
      queued: window.fbq?.queue?.length, requests}));
  } catch {}
}

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
      script.addEventListener('load', () => debugTracking('library-loaded'));
      script.addEventListener('error', () => debugTracking('library-load-failed'));
      document.head.appendChild(script);
    }
    window.fbq('set', 'autoConfig', false, pixelId);
    window.fbq('init', pixelId);
    window.fbq('trackSingle', pixelId, 'PageView');
    ready = true;
    if (debugEnabled) {
      setTimeout(() => debugTracking('after-initialization'), 3000);
    }
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
