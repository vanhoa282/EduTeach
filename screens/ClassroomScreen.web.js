// =============================================================================
// EduTeach — Phòng học WebRTC cho WEB / DESKTOP (Electron).
// File .web.js: Metro tự chọn file này thay cho ClassroomScreen.js khi bundle
// web; bản Android/iOS KHÔNG bị ảnh hưởng (vẫn dùng ClassroomScreen.js native).
//
// Dùng RTCPeerConnection của trình duyệt/Chromium, tương thích dây (wire
// protocol) 100% với app native: cùng bảng/RPC signaling, cùng payload
// {sdp, offer_id} và {candidate:{candidate, sdpMid, sdpMLineIndex}}, cùng
// data channel 'eduteach-chat' với JSON {text, at} — gia sư mở máy tính vẫn
// học chung với học sinh mở điện thoại bình thường.
// =============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  isOfferer, isParticipant, newOfferId, nextReconnectDelay,
  MAX_RECONNECT_ATTEMPTS, getJoinWindow, buildIceServers,
} from '../lib/webrtc/session';
import { sendSignal, subscribeSignaling, clearSignals } from '../lib/webrtc/signaling';

const STATUS = { connecting: 'Đang kết nối…', connected: 'Đã kết nối', disconnected: 'Mất kết nối' };
const OFFER_INTERVAL_MS = 3500;

function VideoEl({ stream, muted, mirror, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      if (stream && el.srcObject !== stream) el.srcObject = stream;
      if (!stream && el.srcObject) el.srcObject = null;
    }
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={!!muted}
      style={{
        width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000',
        transform: mirror ? 'scaleX(-1)' : 'none', display: 'block',
        ...(style || {}),
      }}
    />
  );
}

export default function ClassroomScreen({ user, session, onBack }) {
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const localStreamRef = useRef(null);
  const camTrackRef = useRef(null);
  const subRef = useRef(null);
  const offerTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const currentOfferIdRef = useRef(null);
  const lastOfferIdRef = useRef(null);
  const mountedRef = useRef(true);
  const chatScrollRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [connStatus, setConnStatus] = useState(STATUS.connecting);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  const allowed = useMemo(() => isParticipant(user, session), [user?.id, session]);
  const offerer = useMemo(() => isOfferer(user), [user?.role]);
  const joinWin = useMemo(() => getJoinWindow(session), [session]);
  const sessionId = session?.id;
  const sessionNumber = session?.session_number || '?';
  const subject = session?.course?.subject || session?.subject || 'Lớp học trực tuyến';

  const cleanupPeer = useCallback(() => {
    if (offerTimerRef.current) { clearInterval(offerTimerRef.current); offerTimerRef.current = null; }
    try { dcRef.current?.close(); } catch (e) {}
    dcRef.current = null;
    try { pcRef.current?.close(); } catch (e) {}
    pcRef.current = null;
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) { setFailed(true); setLoading(false); return; }
    const delay = nextReconnectDelay(reconnectAttemptRef.current);
    reconnectAttemptRef.current += 1;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => { if (mountedRef.current) setRetryKey(k => k + 1); }, delay);
  }, []);

  const wireDataChannel = useCallback((dc) => {
    dcRef.current = dc;
    dc.onmessage = (event) => {
      try {
        const msg = typeof event?.data === 'string' ? JSON.parse(event.data) : null;
        if (msg && typeof msg.text === 'string' && msg.text.trim() && mountedRef.current) {
          setChatMessages(prev => [...prev.slice(-80), { from: 'remote', text: msg.text, at: msg.at || Date.now() }]);
        }
      } catch (e) {}
    };
  }, []);

  const createPc = useCallback(() => {
    cleanupPeer();
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    pcRef.current = pc;
    const stream = localStreamRef.current;
    if (stream) stream.getTracks().forEach(t => { try { pc.addTrack(t, stream); } catch (e) {} });
    pc.onicecandidate = (ev) => {
      if (ev.candidate && sessionId && user?.id) {
        sendSignal(sessionId, user.id, 'ice', {
          candidate: {
            candidate: ev.candidate.candidate,
            sdpMid: ev.candidate.sdpMid,
            sdpMLineIndex: ev.candidate.sdpMLineIndex,
          },
        }).catch(() => {});
      }
    };
    pc.ontrack = (ev) => {
      const s = (ev.streams && ev.streams[0]) || null;
      if (s && mountedRef.current) setRemoteStream(s);
    };
    pc.onconnectionstatechange = () => {
      if (!mountedRef.current) return;
      const st = pc.connectionState;
      if (st === 'connected') {
        reconnectAttemptRef.current = 0;
        setConnStatus(STATUS.connected); setLoading(false); setFailed(false);
      } else if (st === 'connecting' || st === 'checking') {
        setConnStatus(STATUS.connecting);
      } else if (st === 'disconnected' || st === 'failed' || st === 'closed') {
        setConnStatus(STATUS.disconnected);
        if (st !== 'closed') scheduleReconnect();
      }
    };
    if (offerer) {
      try { wireDataChannel(pc.createDataChannel('eduteach-chat', { ordered: true })); } catch (e) {}
    } else {
      pc.ondatachannel = (ev) => { if (ev?.channel) wireDataChannel(ev.channel); };
    }
    return pc;
  }, [cleanupPeer, offerer, sessionId, user?.id, scheduleReconnect, wireDataChannel]);

  const startOfferLoop = useCallback(() => {
    if (offerTimerRef.current) clearInterval(offerTimerRef.current);
    const tick = async () => {
      const pc = pcRef.current;
      if (!pc || !sessionId || !user?.id) return;
      if (pc.connectionState === 'connected') return;
      try {
        const offerId = newOfferId();
        currentOfferIdRef.current = offerId;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal(sessionId, user.id, 'offer', { sdp: pc.localDescription.sdp, offer_id: offerId });
      } catch (e) {}
    };
    tick();
    offerTimerRef.current = setInterval(tick, OFFER_INTERVAL_MS);
  }, [sessionId, user?.id]);

  const handleSignal = useCallback(async (row) => {
    if (!row || !mountedRef.current) return;
    if (row.sender_id === user?.id) return;
    const payload = row.payload || {};
    try {
      if (row.kind === 'offer' && !offerer) {
        if (payload.offer_id && payload.offer_id === lastOfferIdRef.current && pcRef.current) return;
        lastOfferIdRef.current = payload.offer_id || null;
        const pc = createPc();
        await pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal(sessionId, user.id, 'answer', { sdp: pc.localDescription.sdp, offer_id: payload.offer_id });
      } else if (row.kind === 'answer' && offerer) {
        const pc = pcRef.current;
        if (!pc) return;
        if (currentOfferIdRef.current && payload.offer_id && payload.offer_id !== currentOfferIdRef.current) return;
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp });
        }
      } else if (row.kind === 'ice') {
        const pc = pcRef.current;
        if (pc && payload.candidate) {
          try { await pc.addIceCandidate(payload.candidate); } catch (e) {}
        }
      } else if (row.kind === 'leave') {
        if (mountedRef.current) { setRemoteStream(null); setConnStatus(STATUS.disconnected); if (offerer) scheduleReconnect(); }
      }
    } catch (e) {
      if (mountedRef.current) { setFailed(true); setErrorMsg(e?.message || 'Lỗi trao đổi tín hiệu kết nối.'); setLoading(false); }
    }
  }, [createPc, offerer, sessionId, user?.id, scheduleReconnect]);

  useEffect(() => {
    mountedRef.current = true;
    if (!allowed || !joinWin.open || !sessionId || !user?.id) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true); setFailed(false); setErrorMsg('');
      setConnStatus(STATUS.connecting); setRemoteStream(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        camTrackRef.current = stream.getVideoTracks()[0] || null;
        setLocalStream(stream);
        createPc();
        subRef.current = subscribeSignaling(sessionId, user.id, (row) => { if (!cancelled) handleSignal(row); });
        if (offerer) {
          try { await clearSignals(sessionId); } catch (e) {}
          startOfferLoop();
        }
        if (mountedRef.current) setLoading(false);
      } catch (e) {
        if (cancelled || !mountedRef.current) return;
        setFailed(true); setLoading(false);
        setErrorMsg(e?.message || 'Không truy cập được camera/mic. Hãy cho phép trình duyệt dùng camera và micro.');
      }
    })();
    return () => {
      cancelled = true; mountedRef.current = false;
      if (subRef.current) { try { subRef.current.unsubscribe(); } catch (e) {} subRef.current = null; }
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      cleanupPeer();
      if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => { try { t.stop(); } catch (e) {} }); localStreamRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, joinWin.open, sessionId, user?.id, retryKey]);

  const leaveRoom = useCallback(async () => {
    try { if (sessionId && user?.id) await sendSignal(sessionId, user.id, 'leave', {}); } catch (e) {}
    onBack && onBack();
  }, [sessionId, user?.id, onBack]);

  const toggleMute = () => {
    const stream = localStreamRef.current; if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach(t => { t.enabled = !next; });
    setMuted(next);
  };

  const toggleCam = () => {
    const stream = localStreamRef.current; if (!stream) return;
    const next = !camOff;
    stream.getVideoTracks().forEach(t => { t.enabled = !next; });
    setCamOff(next);
  };

  const toggleScreenShare = async () => {
    const pc = pcRef.current;
    const sender = pc?.getSenders?.().find(s => s.track && s.track.kind === 'video');
    if (!pc || !sender) return;
    try {
      if (sharingScreen) {
        const cam = camTrackRef.current;
        if (cam) await sender.replaceTrack(cam);
        const tracks = localStreamRef.current?.getVideoTracks() || [];
        tracks.forEach(t => { if (t !== cam) { try { t.stop(); } catch (e) {} } });
        if (localStreamRef.current && cam) {
          const ns = new MediaStream([...localStreamRef.current.getAudioTracks(), cam]);
          localStreamRef.current = ns; setLocalStream(ns);
        }
        setSharingScreen(false);
      } else {
        if (!navigator.mediaDevices.getDisplayMedia) throw new Error('Trình duyệt này không hỗ trợ chia sẻ màn hình.');
        const disp = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const track = disp.getVideoTracks()[0];
        if (!track) throw new Error('Không lấy được màn hình.');
        track.onended = () => { if (mountedRef.current) toggleScreenShareRef.current?.(); };
        await sender.replaceTrack(track);
        const ns = new MediaStream([...(localStreamRef.current?.getAudioTracks() || []), track]);
        localStreamRef.current = ns; setLocalStream(ns);
        setSharingScreen(true); setCamOff(false);
      }
    } catch (e) {
      setErrorMsg(e?.message || 'Không chia sẻ được màn hình.');
    }
  };
  const toggleScreenShareRef = useRef(null);
  toggleScreenShareRef.current = toggleScreenShare;

  const sendChatMessage = () => {
    const text = chatText.trim();
    if (!text) return;
    const dc = dcRef.current;
    if (dc && dc.readyState === 'open') {
      try {
        dc.send(JSON.stringify({ text, at: Date.now() }));
        setChatMessages(prev => [...prev.slice(-80), { from: 'me', text, at: Date.now() }]);
        setChatText('');
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 80);
      } catch (e) {}
    }
  };

  if (!allowed || !joinWin.open) {
    const blockedByTime = allowed && !joinWin.open;
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
            <Ionicons name={blockedByTime ? 'time-outline' : 'lock-closed'} size={40} color="#EF4444" />
          </View>
          <Text style={styles.blockTitle}>{blockedByTime ? 'Chưa tới giờ vào lớp' : 'Bạn không thuộc buổi học này'}</Text>
          <Text style={styles.blockDesc}>{blockedByTime ? joinWin.hint : 'Phòng học chỉ dành cho học sinh và gia sư của buổi học.'}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onBack}>
            <Text style={styles.primaryBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = connStatus === STATUS.connected ? '#10B981' : connStatus === STATUS.disconnected ? '#EF4444' : '#F59E0B';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={leaveRoom} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>Phòng học · Buổi {sessionNumber}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.headerSub} numberOfLines={1}>{subject} · {connStatus}</Text>
          </View>
        </View>
      </View>

      <View style={styles.stage}>
        {remoteStream ? (
          <VideoEl stream={remoteStream} />
        ) : (
          <View style={styles.waitingBox}>
            {loading ? <ActivityIndicator size="large" color="#fff" /> : null}
            <Text style={styles.waitingText}>{failed ? 'Kết nối thất bại' : 'Đang chờ người còn lại vào phòng…'}</Text>
            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            {failed && (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => { reconnectAttemptRef.current = 0; setRetryKey(k => k + 1); }}>
                <Text style={styles.primaryBtnText}>Thử lại</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={styles.pip}>
          <VideoEl stream={localStream} muted mirror={!sharingScreen} />
        </View>
        {!!errorMsg && connStatus === STATUS.connected && (
          <View style={styles.toast}><Text style={styles.toastText}>{errorMsg}</Text></View>
        )}
      </View>

      {showChat && (
        <View style={styles.chatPanel}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Chat trong phòng</Text>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView ref={chatScrollRef} style={styles.chatList} onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}>
            {chatMessages.length === 0 && (
              <Text style={styles.chatEmpty}>Chưa có tin nhắn. Chat chạy thẳng giữa 2 máy (không lưu server).</Text>
            )}
            {chatMessages.map((m, i) => (
              <View key={i} style={[styles.chatBubble, m.from === 'me' ? styles.chatBubbleMe : styles.chatBubbleOther]}>
                <Text style={[styles.chatBubbleText, m.from === 'me' && { color: '#fff' }]}>{m.text}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              value={chatText}
              onChangeText={setChatText}
              placeholder="Nhắn cho người kia..."
              placeholderTextColor="#9CA3AF"
              onSubmitEditing={sendChatMessage}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.chatSendBtn} onPress={sendChatMessage}>
              <Ionicons name="send" size={17} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.controlsBar}>
        <TouchableOpacity style={[styles.ctrlBtn, muted && styles.ctrlBtnActive]} onPress={toggleMute}>
          <Ionicons name={muted ? 'mic-off' : 'mic'} size={20} color={muted ? '#EF4444' : '#111827'} />
          <Text style={styles.ctrlText}>{muted ? 'Bật mic' : 'Tắt mic'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctrlBtn, camOff && styles.ctrlBtnActive]} onPress={toggleCam}>
          <Ionicons name={camOff ? 'videocam-off' : 'videocam'} size={20} color={camOff ? '#EF4444' : '#111827'} />
          <Text style={styles.ctrlText}>{camOff ? 'Bật cam' : 'Tắt cam'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctrlBtn, sharingScreen && styles.ctrlBtnShareActive]} onPress={toggleScreenShare}>
          <Ionicons name={sharingScreen ? 'stop-outline' : 'desktop-outline'} size={20} color={sharingScreen ? '#2563EB' : '#111827'} />
          <Text style={[styles.ctrlText, sharingScreen && styles.ctrlTextShareActive]}>{sharingScreen ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctrlBtn, showChat && styles.ctrlBtnActive]} onPress={() => setShowChat(v => !v)}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={showChat ? '#EF4444' : '#111827'} />
          <Text style={styles.ctrlText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.leaveBtn} onPress={leaveRoom}>
          <Ionicons name="call" size={18} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          <Text style={styles.leaveText}>Rời phòng</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6B7280' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stage: { flex: 1, backgroundColor: '#000', position: 'relative' },
  waitingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  waitingText: { color: '#E5E7EB', fontSize: 15, textAlign: 'center' },
  errorText: { color: '#FCA5A5', fontSize: 13, textAlign: 'center' },
  pip: { position: 'absolute', right: 14, bottom: 14, width: 200, height: 124, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: '#111' },
  toast: { position: 'absolute', top: 12, alignSelf: 'center', backgroundColor: 'rgba(239,68,68,0.92)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  toastText: { color: '#fff', fontSize: 13 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  lockIconBox: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  blockTitle: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center' },
  blockDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  primaryBtn: { marginTop: 10, backgroundColor: '#2563EB', borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  controlsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 10 },
  ctrlBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, backgroundColor: '#F3F4F6' },
  ctrlBtnActive: { backgroundColor: '#FEF2F2' },
  ctrlBtnShareActive: { backgroundColor: '#DBEAFE' },
  ctrlText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  ctrlTextShareActive: { color: '#2563EB' },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 },
  leaveText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  chatPanel: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  chatTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  chatList: { maxHeight: 160 },
  chatEmpty: { fontSize: 12, color: '#9CA3AF', lineHeight: 17, paddingVertical: 6 },
  chatBubble: { alignSelf: 'flex-start', maxWidth: '82%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6, backgroundColor: '#F3F4F6' },
  chatBubbleMe: { alignSelf: 'flex-end', backgroundColor: '#2563EB' },
  chatBubbleOther: { alignSelf: 'flex-start' },
  chatBubbleText: { fontSize: 13, color: '#111827', lineHeight: 18 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  chatInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 13, color: '#111827' },
  chatSendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
});
