import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const JITSI_DOMAIN = 'meet.jit.si';

// Tên phòng: UUID đầy đủ của buổi học → không ai đoán được phòng,
// chỉ HS + gia sư của buổi đó biết link (link nằm trong app).
function buildRoomName(session) {
  const id = (session?.id || '').toString().trim();
  return id ? 'EduTeach_Session_' + id : '';
}

// Chặn người lạ: user phải là học sinh hoặc gia sư của buổi đó.
function isParticipant(user, session) {
  const uid = user?.id;
  const course = session?.course || {};
  const studentId = course.student_id || session.student_id;
  const tutorId = course.tutor_id || session.tutor_id;

  if (studentId && tutorId) return uid === studentId || uid === tutorId;
  if (studentId) return uid === studentId;
  if (tutorId) return uid === tutorId;
  // Thiếu thông tin → vẫn vào được nhờ room name UUID không đoán được.
  return true;
}

function buildJitsiHtml(roomName, displayName) {
  const safeName = (displayName || 'Thành viên EduTeach')
    .replace(/[<>&"']/g, '')
    .slice(0, 40);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<script src="https://${JITSI_DOMAIN}/external_api.js"></script>
<style>
  html, body, #meet { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
</style>
</head>
<body>
<div id="meet"></div>
<script>
(function () {
  var api = null;
  function post(type, data) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data || {} }));
    }
  }
  function start() {
    api = new JitsiMeetExternalAPI('${JITSI_DOMAIN}', {
      roomName: '${roomName}',
      width: '100%',
      height: '100%',
      parentNode: document.getElementById('meet'),
      userInfo: { displayName: '${safeName}' },
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: true,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        disableThirdPartyRequests: true,
        requireDisplayName: true,
        enableClosePage: false,
        defaultLanguage: 'vi'
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: ['microphone', 'camera', 'raisehand', 'chat', 'tileview', 'fullscreen', 'hangup'],
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        SHOW_CHROME_EXTENSION_BANNER: false
      }
    });

    var events = [
      'videoConferenceJoined',
      'videoConferenceLeft',
      'readyToClose',
      'audioMuteStatusChanged',
      'videoMuteStatusChanged',
      'errorOccurred'
    ];
    for (var i = 0; i < events.length; i++) {
      (function (ev) {
        api.addListener(ev, function (payload) {
          post('jitsiEvent', { event: ev, payload: payload || {} });
        });
      })(events[i]);
    }

    api.addListener('participantLeft', function () { post('jitsiEvent', { event: 'participantLeft' }); });
    api.addListener('participantJoined', function () { post('jitsiEvent', { event: 'participantJoined' }); });

    window.__jitsiApi = api;
    window.__jitsiCommand = function (cmd) {
      if (!api) return false;
      try {
        if (cmd === 'toggleAudio') api.executeCommand('toggleAudio');
        else if (cmd === 'toggleVideo') api.executeCommand('toggleVideo');
        else if (cmd === 'hangup') api.executeCommand('hangup');
        return true;
      } catch (e) {
        post('jitsiError', { message: String(e && e.message ? e.message : e) });
        return false;
      }
    };
  }

  function onLoad() {
    try { start(); } catch (e) {
      post('jitsiError', { message: 'Không khởi động được Jitsi: ' + (e && e.message ? e.message : e) });
    }
  }
  if (document.readyState === 'complete') onLoad();
  else window.addEventListener('load', onLoad);

  window.addEventListener('message', function (ev) {
    var data = ev && ev.data;
    if (!data) return;
    if (typeof data === 'string') {
      try {
        var m = JSON.parse(data);
        if (m && m.cmd) {
          if (m.cmd === 'command' && window.__jitsiCommand) window.__jitsiCommand(m.value);
        }
      } catch (e) {}
    }
  });
})();
</script>
</body>
</html>`;
}

export default function ClassroomScreen({ user, session, onBack }) {
  const webRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(true);
  const [camOff, setCamOff] = useState(true);
  const [failed, setFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [webKey, setWebKey] = useState(1);

  const roomName = useMemo(() => buildRoomName(session), [session?.id]);
  const allowed = useMemo(() => isParticipant(user, session), [user?.id, session]);

  const displayName = (user?.full_name || user?.name || 'Thành viên') +
    (user?.role === 'tutor' ? ' · Gia sư' : ' · Học sinh');

  const html = useMemo(
    () => (allowed && roomName ? buildJitsiHtml(roomName, displayName) : '<html><body></body></html>'),
    [allowed, roomName, displayName]
  );

  const subject = session?.course?.subject || session?.subject || 'Lớp học trực tuyến';
  const sessionNumber = session?.session_number || '?';

  const sendCommand = (cmd) => {
    if (!joined) return;
    try {
      webRef.current?.injectJavaScript(
        `window.__jitsiCommand && window.__jitsiCommand('${cmd}'); true;`
      );
    } catch (e) {}
  };

  const handleMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'jitsiEvent') {
        const ev = msg.data?.event;
        if (ev === 'videoConferenceJoined') {
          setJoined(true);
          setLoading(false);
        } else if (ev === 'videoConferenceLeft' || ev === 'readyToClose') {
          setJoined(false);
        } else if (ev === 'audioMuteStatusChanged') {
          setMuted(!!msg.data?.payload?.muted);
        } else if (ev === 'videoMuteStatusChanged') {
          setCamOff(!!msg.data?.payload?.muted);
        } else if (ev === 'errorOccurred') {
          setFailed(true);
          setErrorMsg('Phòng học báo lỗi kết nối. Thử tải lại.');
        }
      } else if (msg.type === 'jitsiError') {
        setFailed(true);
        setErrorMsg(msg.data?.message || 'Không khởi động được phòng học.');
      }
    } catch (e) {}
  };

  const retry = () => {
    setFailed(false);
    setErrorMsg('');
    setLoading(true);
    setJoined(false);
    setWebKey(k => k + 1);
  };

  const leaveRoom = () => {
    if (joined) sendCommand('hangup');
    onBack();
  };

  // ===== UI TRẠNG THÁI =====

  if (!allowed) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Phòng học</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerBox}>
          <View style={styles.lockIconBox}>
            <Ionicons name="lock-closed" size={40} color="#EF4444" />
          </View>
          <Text style={styles.blockTitle}>Bạn không thuộc buổi học này</Text>
          <Text style={styles.blockDesc}>
            Phòng học chỉ dành cho học sinh và gia sư của buổi học.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onBack}>
            <Text style={styles.primaryBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={fullscreen ? [] : ['top']}>
      {!fullscreen && (
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Phòng học · Buổi {sessionNumber}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>{subject}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setFullscreen(true)}
            style={styles.iconBtn}
            disabled={!joined}
          >
            <Ionicons name="expand-outline" size={22} color={joined ? '#2563EB' : '#D1D5DB'} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.webContainer}>
        <WebView
          key={webKey}
          ref={webRef}
          originWhitelist={['https://*', 'http://*']}
          source={{ html, baseUrl: 'https://' + JITSI_DOMAIN + '/' }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
          startInLoadingState
          onMessage={handleMessage}
          onLoadEnd={() => { if (!joined) setLoading(false); }}
          onError={(e) => {
            setFailed(true);
            setErrorMsg('Không tải được phòng học (' +
              (e?.nativeEvent?.description || 'lỗi mạng') + ').');
          }}
          onHttpError={() => {
            setFailed(true);
            setErrorMsg('Không kết nối được máy chủ Jitsi. Kiểm tra mạng rồi thử lại.');
          }}
          onShouldStartLoadWithRequest={(req) => {
            // KHÔNG BAO GIỜ mở intent:// hay app ngoài.
            if (!req?.url) return false;
            const url = req.url.toLowerCase();
            if (url.startsWith('intent://') ||
                url.startsWith('market://') ||
                url.startsWith('tel:') ||
                url.startsWith('sms:') ||
                url.startsWith('mailto:')) {
              return false;
            }
            return true;
          }}
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Đang kết nối phòng học...</Text>
            </View>
          )}
        />

        {loading && !failed && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>
              {joined ? 'Đang vào phòng...' : 'Đang kết nối Jitsi Meet...'}
            </Text>
          </View>
        )}

        {failed && (
          <View style={styles.loadingOverlay}>
            <View style={styles.errIconBox}>
              <Ionicons name="cloud-offline-outline" size={36} color="#EF4444" />
            </View>
            <Text style={styles.errTitle}>Không vào được phòng học</Text>
            <Text style={styles.errDesc}>{errorMsg || 'Đã có lỗi xảy ra.'}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={retry}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!fullscreen && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.ctrlBtn, muted && styles.ctrlBtnActive]}
            onPress={() => sendCommand('toggleAudio')}
            disabled={!joined}
          >
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={20} color={muted ? '#EF4444' : '#111827'} />
            <Text style={styles.ctrlText}>{muted ? 'Bật mic' : 'Tắt mic'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctrlBtn, camOff && styles.ctrlBtnActive]}
            onPress={() => sendCommand('toggleVideo')}
            disabled={!joined}
          >
            <Ionicons name={camOff ? 'videocam-off' : 'videocam'} size={20} color={camOff ? '#EF4444' : '#111827'} />
            <Text style={styles.ctrlText}>{camOff ? 'Bật cam' : 'Tắt cam'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.leaveBtn}
            onPress={leaveRoom}
          >
            <Ionicons name="call" size={18} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            <Text style={styles.leaveText}>Rời phòng</Text>
          </TouchableOpacity>
        </View>
      )}

      {fullscreen && (
        <View style={styles.fsBar}>
          <Text style={styles.fsText} numberOfLines={1}>
            Buổi {sessionNumber} · {subject}
          </Text>
          <TouchableOpacity style={styles.fsBtn} onPress={() => setFullscreen(false)}>
            <Ionicons name="contract-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerInfo: { flex: 1, marginLeft: 4 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  webContainer: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B1220',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 32,
  },
  loadingText: { marginTop: 14, fontSize: 14, color: '#9CA3AF' },
  errIconBox: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  errTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  errDesc: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 8, lineHeight: 19 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2563EB', paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: 12, marginTop: 18,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  centerBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F9FAFB', paddingHorizontal: 32,
  },
  lockIconBox: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  blockTitle: { fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' },
  blockDesc: {
    fontSize: 14, color: '#6B7280', textAlign: 'center',
    marginTop: 10, lineHeight: 21,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  ctrlBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 22, backgroundColor: '#F3F4F6',
  },
  ctrlBtnActive: { backgroundColor: '#FEF2F2' },
  ctrlText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EF4444', paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 22,
  },
  leaveText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  fsBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(17,24,39,0.85)', paddingHorizontal: 12, paddingVertical: 8,
    zIndex: 20,
  },
  fsText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600', marginRight: 8 },
  fsBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
