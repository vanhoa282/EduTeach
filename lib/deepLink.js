// Deep-link queue cho app navigation theo state (không dùng React Navigation).
// API tương tự navigationRef: isReady + queue khi chưa sẵn sàng.

let ready = false;
let handler = null;
const queue = [];

export function deepLinkIsReady() {
  return ready && typeof handler === 'function';
}

export function setDeepLinkHandler(fn) {
  handler = typeof fn === 'function' ? fn : null;
  ready = !!handler;
  if (ready) flushDeepLinkQueue();
}

export function clearDeepLinkHandler() {
  handler = null;
  ready = false;
}

export function enqueueDeepLink(data) {
  if (!data || typeof data !== 'object') return;
  console.log('[DeepLink]', data);
  if (deepLinkIsReady()) {
    try {
      handler(data);
    } catch (e) {
      console.log('[DeepLink] handler error:', e.message);
    }
    return;
  }
  queue.push(data);
}

export function flushDeepLinkQueue() {
  if (!deepLinkIsReady()) return;
  while (queue.length > 0) {
    const next = queue.shift();
    try {
      handler(next);
    } catch (e) {
      console.log('[DeepLink] flush error:', e.message);
    }
  }
}

export function clearDeepLinkQueue() {
  queue.length = 0;
}

/** Chuẩn hoá payload từ push / local notification. */
export function normalizeNotifData(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const data = { ...raw };
  // Expo đôi khi stringify nested values
  for (const key of Object.keys(data)) {
    if (typeof data[key] === 'string') {
      const s = data[key].trim();
      if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
        try {
          data[key] = JSON.parse(s);
        } catch (e) {}
      }
    }
  }
  if (!data.type && data.screen === 'courses') {
    data.type = 'session_reminder';
  }
  return data;
}
