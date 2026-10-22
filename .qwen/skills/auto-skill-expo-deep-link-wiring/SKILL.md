---
name: expo-deep-link-wiring
description: Wire push-notification deep links into Expo app with state-based navigation (no React Navigation) via lib/deepLink queue
source: auto-skill
extracted_at: '2026-10-14T22:06:11.055Z'
---

# Expo Deep Link Wiring (State Navigation)

Wire `lib/deepLink.js` (`setDeepLinkHandler`, `enqueueDeepLink`, `normalizeNotifData`, `clearDeepLinkQueue`) into an Expo app that uses `useState` screen navigation instead of React Navigation.

## When to use
- `App.js` has `addNotificationResponseReceivedListener(() => {})` empty and `lib/deepLink.js` exists but is not wired.
- Navigation state (`selectedCourse`, `selectedConversation`, etc.) lives in child tabs (`MainTabs`/`TutorMainTabs`), not in `App.js`.

## Procedure

### 1. Backup
```bash
mkdir -p backups && cp App.js backups/App.before-wire-deeplink.js
```

### 2. Read App.js first — identify actual state
- Check what `AppInner` really owns: typically only `screen`/`setScreen` and `user`/`setUser`.
- Do NOT blindly apply template `setSelectedCourse`/`setSelectedConversation` — they usually don't exist in `App.js`.
- Note existing `useRef` listener pattern (`notifListener`, `responseListener`) and `handleLogout`.

### 3. Import at top of App.js
```js
import { setDeepLinkHandler, enqueueDeepLink, normalizeNotifData, clearDeepLinkQueue } from './lib/deepLink';
```

### 4. Add pendingDeepLink bridge in AppInner
```js
const [pendingDeepLink, setPendingDeepLink] = useState(null);

useEffect(() => {
  setDeepLinkHandler((data) => {
    if (!data || !data.type) return;
    // App.js only knows screen — delegate detail to Tabs
    setPendingDeepLink(data);
    setScreen('main');
  });
  return () => clearDeepLinkQueue();
}, []);
```

Why: `lib/deepLink.js` queues when `!ready` and flushes on `setDeepLinkHandler`. This covers:
- Foreground: handler ready → immediate navigate
- Background: enqueue → flush when AppState active
- Killed: enqueue → flush after login when handler mounts

### 5. Replace empty notification listener
```js
// Before:
responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {});

// After:
responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
  const data = normalizeNotifData(response.notification.request.content.data);
  if (data) enqueueDeepLink(data);
});
```
Keep existing `useRef` + `remove()` cleanup — don't switch to `const sub` unless refactoring whole effect.

### 6. Clear on logout + pass to Tabs
```js
const handleLogout = async () => {
  clearDeepLinkQueue();
  setPendingDeepLink(null);
  setUser(null);
  setScreen('auth');
  // ... existing clearAuthSession + AsyncStorage
};

// Render:
if (user.role === 'tutor') return <TutorMainTabs ... pendingDeepLink={pendingDeepLink} onDeepLinkConsumed={() => setPendingDeepLink(null)} />;
return <MainTabs ... pendingDeepLink={pendingDeepLink} onDeepLinkConsumed={() => setPendingDeepLink(null)} />;
```

### 7. Consume in MainTabs / TutorMainTabs
```js
export default function MainTabs({ user: initialUser, onLogout, pendingDeepLink, onDeepLinkConsumed }) {
  // ...
  useEffect(() => {
    if (!pendingDeepLink || !onDeepLinkConsumed) return;
    const d = pendingDeepLink;
    if (d.type === 'session_reminder' && d.courseId) {
      setSelectedCourseId(d.courseId);
      onDeepLinkConsumed();
    } else if (d.type === 'message' && d.conversationId) {
      (async () => {
        const { data: conv } = await supabase.from('conversations')
          .select('*, student:users!conversations_student_id_fkey (id, full_name, phone), tutor:users!conversations_tutor_id_fkey (id, full_name, phone)')
          .eq('id', d.conversationId).maybeSingle();
        if (conv) setActiveConv(conv);
        onDeepLinkConsumed();
      })();
    } else if (d.type === 'order' && d.orderId) {
      setActiveTab('courses'); // tutor: 'schedule'
      onDeepLinkConsumed();
    } else onDeepLinkConsumed();
  }, [pendingDeepLink]);
}
```

### 8. Verify
```bash
node --check App.js && node --check screens/MainTabs.js && node --check screens/TutorMainTabs.js
git diff --stat
# Do NOT push/commit
```

## Pitfalls
- Template `setScreen('courseDetail')` / `setScreen('chat')` is wrong when App.js has no such screens — use `pendingDeepLink` bridge instead.
- `normalizeNotifData` handles Expo stringified nested values — always pass `response.notification.request.content.data` through it.
- `clearDeepLinkQueue` must run on logout and on handler unmount to avoid stale navigation after re-login.
