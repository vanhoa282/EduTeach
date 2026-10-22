// Foreground service cho phòng học WebRTC — Android.
// Giữ mic/cam/video + signaling sống khi app xuống background.

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

let FA = null;
let AppRegistryBound = false;

function getFA() {
  if (isExpoGo || Platform.OS !== 'android') return null;
  if (FA) return FA;
  try {
    FA = require('expo-foreground-actions');
    return FA;
  } catch (e) {
    return null;
  }
}

// Tên headless task cố định — runForegroundedAction sẽ append ranTaskCount
const HEADLESS = 'eduteach-classroom';

function buildSettings({ title, body, sessionId }) {
  const scheme = Constants?.expoConfig?.scheme || 'eduteach';
  return {
    headlessTaskName: HEADLESS,
    notificationTitle: title,
    notificationDesc: body,
    notificationColor: '#2563EB',
    notificationIconName: 'ic_launcher',
    notificationIconType: 'mipmap',
    notificationProgress: 0,
    notificationMaxProgress: 0,
    notificationIndeterminate: true,
    linkingURI: sessionId ? `${scheme}://classroom?sessionId=${encodeURIComponent(sessionId)}` : `${scheme}://`,
  };
}

function fmtDuration(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function classroomNotifText({ durationSec, muted, camOff, sharingScreen }) {
  const flags = [];
  if (muted) flags.push('mic tắt');
  if (camOff) flags.push('cam tắt');
  if (sharingScreen) flags.push('chia sẻ MH');
  const suffix = flags.length ? ` · ${flags.join(' · ')}` : '';
  return `${fmtDuration(durationSec)}${suffix} — chạm để quay lại phòng`;
}

// Dùng runForegroundedAction (cần headless task đăng ký).
// Api: runForegroundedAction(act(api), androidSettings, {runInJS})
// act chạy cho tới khi return — dùng để giữ service sống.

let activeId = null;
let headlessRegistered = false;

function ensureHeadless() {
  if (headlessRegistered || Platform.OS !== 'android') return;
  try {
    const { AppRegistry } = require('react-native');
    // runForegroundedAction sẽ tự register headless task ${HEADLESS}${count},
    // nhưng ta cần 1 handler rỗng cho tên base để không crash nếu system gọi.
    if (!AppRegistryBound) {
      AppRegistryBound = true;
      // noop — thực tế headless được register trong runAndroid
    }
    headlessRegistered = true;
  } catch (e) {}
}

export async function startClassroomForeground({ sessionId, subject, durationSec, muted, camOff, sharingScreen }) {
  const fa = getFA();
  if (!fa) return null;
  ensureHeadless();

  const title = `Đang trong phòng học · ${subject || 'Lớp học'}`;
  const body = classroomNotifText({ durationSec: durationSec || 0, muted: !!muted, camOff: !!camOff, sharingScreen: !!sharingScreen });
  const settings = buildSettings({ title, body, sessionId });

  try {
    // Nếu đã chạy trước đó → update thay vì start mới
    if (activeId != null) {
      await updateClassroomForeground({ sessionId, subject, durationSec, muted, camOff, sharingScreen });
      return activeId;
    }

    // Chạy foreground action giữ service sống; act chờ tới khi service bị stop.
    // runForegroundedAction sẽ startForegroundService và resolve khi headless kết thúc.
    // Ta giữ act pending (không return) để service còn sống; stop sẽ resolve nó.
    const holder = { done: false };
    const actPromise = fa.runForegroundedAction(
      async (api) => {
        activeId = api.identifier;
        // Giữ sống — đợi tới khi stop được gọi (sẽ reject/resolve qua stopForegroundAction)
        await new Promise(() => {}); // never resolves — service stays up
      },
      settings,
      {
        runInJS: false,
        events: {
          onIdentifier: (id) => {
            activeId = id;
          },
        },
      }
    );
    // Không await actPromise — để service chạy nền, không block UI
    actPromise.catch(() => {});
    // Đợi 1 tick để onIdentifier kịp set
    await new Promise((r) => setTimeout(r, 400));
    return activeId;
  } catch (e) {
    console.log('[ClassroomFG] start error:', e?.message);
    // Fallback: thử startForegroundAction trực tiếp nếu runForegroundedAction không khả dụng
    try {
      const { Platform: RNPlatform } = require('react-native');
      if (fa.startForegroundAction) {
        const id = await fa.startForegroundAction(settings);
        activeId = id;
        return id;
      }
    } catch (e2) {
      console.log('[ClassroomFG] fallback start error:', e2?.message);
    }
    return null;
  }
}

export async function updateClassroomForeground({ sessionId, subject, durationSec, muted, camOff, sharingScreen }) {
  const fa = getFA();
  if (!fa || activeId == null) return;
  const title = `Đang trong phòng học · ${subject || 'Lớp học'}`;
  const body = classroomNotifText({ durationSec: durationSec || 0, muted: !!muted, camOff: !!camOff, sharingScreen: !!sharingScreen });
  const settings = buildSettings({ title, body, sessionId });
  try {
    if (fa.updateForegroundedAction) {
      await fa.updateForegroundedAction(activeId, settings);
    }
  } catch (e) {}
}

export async function stopClassroomForeground() {
  const fa = getFA();
  if (!fa) {
    activeId = null;
    return;
  }
  const id = activeId;
  activeId = null;
  try {
    if (id != null && fa.stopForegroundAction) {
      await fa.stopForegroundAction(id);
    } else if (fa.forceStopAllForegroundActions) {
      await fa.forceStopAllForegroundActions();
    }
  } catch (e) {}
}

export function getClassroomForegroundId() {
  return activeId;
}

export function isClassroomForegroundSupported() {
  return !isExpoGo && Platform.OS === 'android' && !!getFA();
}
