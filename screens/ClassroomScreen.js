import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { EduTeachPeer } from '../lib/webrtc/peer';
import {
  isOfferer,
  isParticipant,
  newOfferId,
  nextReconnectDelay,
  MAX_RECONNECT_ATTEMPTS,
} from '../lib/webrtc/session';
import { subscribeSignaling, sendSignal, clearSignals } from '../lib/webrtc/signaling';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
const hasWebRTC = !!NativeModules.WebRTCModule;

function getRTCView() {
  if (!hasWebRTC) return null;
  try {
    return require('react-native-webrtc').RTCView;
  } catch (e) {
    return null;
  }
}

const OFFER_INTERVAL_MS = 3500;
const STATUS = {
  connecting: 'Đang kết nối',
  connected: 'Đã kết nối',
  disconnected: 'Mất kết nối',
};

export default function ClassroomScreen({ user, session, onBack }) {
  const peerRef = useRef(null);
  const subRef = useRef(null);
  const offerTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectPendingRef = useRef(false);
  const mountedRef = useRef(true);
  const currentOfferIdRef = useRef(null);
  const facingRef = useRef('user');

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [connStatus, setConnStatus] = useState(STATUS.connecting);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const allowed = useMemo(() => isParticipant(user, session), [user?.id, session]);
  const offerer = useMemo(() => isOfferer(user), [user?.role]);
  const sessionId = session?.id;
  const sessionNumber = session?.session_number || '?';
  const subject = session?.course?.subject || session?.subject || 'Lớp học trực tuyến';

  const cleanup = useCallback(async ({ notifyLeave = false } = {}) => {
    if (offerTimerRef.current) {
      clearInterval(offerTimerRef.current);
      offerTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (subRef.current) {
      try { subRef.current.unsubscribe(); } catch (e) {}
      subRef.current = null;
    }
    if (notifyLeave && sessionId && user?.id) {
      try { await sendSignal(sessionId, user.id, 'leave', {}); } catch (e) {}
      try { await clearSignals(sessionId); } catch (e) {}
    }
    if (peerRef.current) {
      try { peerRef.current.close(); } catch (e) {}
      peerRef.current = null;
    }
    if (mountedRef.current) {
      setLocalStream(null);
      setRemoteStream(null);
    }
  }, [sessionId, user?.id]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || !offerer) return;
    if (reconnectPendingRef.current) return;
    if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setFailed(true);
      setErrorMsg('Mất kết nối quá nhiều lần. Bấm "Thử lại".');
      setConnStatus(STATUS.disconnected);
      return;
    }
    reconnectPendingRef.current = true;
    const delay = nextReconnectDelay(reconnectAttemptRef.current);
    reconnectAttemptRef.current += 1;
    setConnStatus(STATUS.disconnected);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      reconnectPendingRef.current = false;
      if (!mountedRef.current) return;
      const peer = peerRef.current;
      if (!peer || peer.closed) return;
      try {
        peer.closePc();
        peer.createPc();
        currentOfferIdRef.current = null;
        setRemoteStream(null);
        setConnStatus(STATUS.connecting);
      } catch (e) {}
    }, delay);
  }, [offerer]);

  const handlePeerEvent = useCallback((event) => {
    if (!mountedRef.current || !event) return;

    if (event.type === 'remotestream' && event.stream) {
      setRemoteStream(event.stream);
    }

    if (event.type === 'connectionstate') {
      const state = event.state;
      if (state === 'connected') {
        reconnectAttemptRef.current = 0;
        reconnectPendingRef.current = false;
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        setConnStatus(STATUS.connected);
        setLoading(false);
        setFailed(false);
      } else if (state === 'connecting' || state === 'checking') {
        setConnStatus(STATUS.connecting);
      } else if (state === 'disconnected' || state === 'failed') {
        setConnStatus(STATUS.disconnected);
        scheduleReconnect();
      } else if (state === 'closed') {
        setConnStatus(STATUS.disconnected);
      }
    }

    if (event.type === 'iceconnectionstate') {
      const state = event.state;
      if (state === 'connected' || state === 'completed') {
        reconnectAttemptRef.current = 0;
        reconnectPendingRef.current = false;
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        setConnStatus(STATUS.connected);
        setLoading(false);
      } else if (state === 'disconnected' || state === 'failed') {
        setConnStatus(STATUS.disconnected);
        scheduleReconnect();
      }
    }
  }, [scheduleReconnect]);

  const startOfferLoop = useCallback(() => {
    if (offerTimerRef.current) clearInterval(offerTimerRef.current);

    const tick = async () => {
      const peer = peerRef.current;
      if (!peer || peer.closed || !sessionId || !user?.id) return;
      if (peer.pc?.connectionState === 'connected') return;
      try {
        const offerId = newOfferId();
        currentOfferIdRef.current = offerId;
        const payload = await peer.sendOffer(offerId);
        if (payload && mountedRef.current) {
          await sendSignal(sessionId, user.id, 'offer', payload);
        }
      } catch (e) {
        // mất mạng tạm → vòng sau gửi tiếp
      }
    };

    tick();
    offerTimerRef.current = setInterval(tick, OFFER_INTERVAL_MS);
  }, [sessionId, user?.id]);

  const handleSignal = useCallback(async (row) => {
    if (!row || !mountedRef.current) return;
    if (row.sender_id === user?.id) return;
    const peer = peerRef.current;
    if (!peer || peer.closed) return;

    const kind = row.kind;
    const payload = row.payload || {};

    try {
      if (kind === 'offer' && !offerer) {
        const answer = await peer.handleOffer(payload);
        if (answer && sessionId && user?.id) {
          await sendSignal(sessionId, user.id, 'answer', answer);
        }
      } else if (kind === 'answer' && offerer) {
        if (
          currentOfferIdRef.current &&
          payload.offer_id &&
          payload.offer_id !== currentOfferIdRef.current
        ) {
          return;
        }
        await peer.handleAnswer(payload);
      } else if (kind === 'ice') {
        await peer.handleIce(payload);
      } else if (kind === 'leave') {
        setRemoteStream(null);
        setConnStatus(STATUS.disconnected);
        if (offerer) scheduleReconnect();
      }
    } catch (e) {
      if (mountedRef.current) {
        setFailed(true);
        setErrorMsg(e?.message || 'Lỗi trao đổi tín hiệu kết nối.');
        setLoading(false);
      }
    }
  }, [user?.id, offerer, sessionId, scheduleReconnect]);

  useEffect(() => {
    mountedRef.current = true;

    if (isExpoGo || !hasWebRTC) return undefined;
    if (!allowed || !sessionId || !user?.id) return undefined;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setFailed(false);
      setErrorMsg('');
      setConnStatus(STATUS.connecting);
      setRemoteStream(null);
      reconnectAttemptRef.current = 0;

      try {
        const peer = new EduTeachPeer({
          isOfferer: offerer,
          onEvent: (ev) => {
            if (!cancelled) handlePeerEvent(ev);
          },
        });
        peerRef.current = peer;

        const stream = await peer.initLocalMedia(facingRef.current);
        if (cancelled) {
          peer.close();
          return;
        }
        setLocalStream(stream);
        peer.createPc();

        // Gửi ICE candidate qua signaling
        const prevOnEvent = peer.onEvent;
        peer.onEvent = (ev) => {
          prevOnEvent(ev);
          if (ev?.type === 'ice' && ev.candidate && sessionId && user?.id && !cancelled) {
            sendSignal(sessionId, user.id, 'ice', { candidate: ev.candidate }).catch(() => {});
          }
        };

        subRef.current = subscribeSignaling(sessionId, (row) => {
          if (!cancelled) handleSignal(row);
        });

        if (offerer) {
          try { await clearSignals(sessionId); } catch (e) {}
          startOfferLoop();
        }

        if (mountedRef.current) setLoading(false);
      } catch (e) {
        if (cancelled || !mountedRef.current) return;
        setFailed(true);
        setLoading(false);
        setErrorMsg(e?.message || 'Không khởi tạo được camera/mic.');
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      cleanup({ notifyLeave: true });
    };
  }, [
    allowed,
    sessionId,
    user?.id,
    offerer,
    retryKey,
    handlePeerEvent,
    handleSignal,
    startOfferLoop,
    cleanup,
  ]);

  const toggleMute = () => {
    const peer = peerRef.current;
    const stream = peer?.localStream;
    if (!stream) return;
    const next = !muted;
    for (const t of stream.getAudioTracks()) {
      t.enabled = !next;
    }
    setMuted(next);
  };

  const toggleCam = () => {
    const peer = peerRef.current;
    const stream = peer?.localStream;
    if (!stream) return;
    const next = !camOff;
    for (const t of stream.getVideoTracks()) {
      t.enabled = !next;
    }
    setCamOff(next);
  };

  const flipCamera = async () => {
    const peer = peerRef.current;
    if (!peer || peer.closed || camOff) return;
    const nextFacing = facingRef.current === 'user' ? 'environment' : 'user';
    try {
      const camStream = await peer.getCameraStream(nextFacing);
      const newTrack = camStream.getVideoTracks()[0];
      if (!newTrack) return;

      const oldTrack = peer.localStream?.getVideoTracks()?.[0];
      if (peer.localStream && oldTrack) {
        peer.localStream.removeTrack(oldTrack);
        peer.localStream.addTrack(newTrack);
        try { oldTrack.stop(); } catch (e) {}
      }

      const sender = peer.pc?.getSenders?.()?.find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newTrack);
      }

      facingRef.current = nextFacing;
      setLocalStream(peer.localStream);
      // Dọn audio-less stream container (track đã chuyển sang localStream)
      for (const t of camStream.getTracks()) {
        if (t !== newTrack) {
          try { t.stop(); } catch (e) {}
        }
      }
    } catch (e) {
      setErrorMsg(e?.message || 'Không đổi được camera.');
    }
  };

  const retry = () => {
    setFailed(false);
    setErrorMsg('');
    setLoading(true);
    setConnStatus(STATUS.connecting);
    reconnectAttemptRef.current = 0;
    setRetryKey((k) => k + 1);
  };

  const leaveRoom = async () => {
    await cleanup({ notifyLeave: true });
    onBack();
  };

  // ── Expo Go / thiếu native module ──────────────────────────────────────
  if (isExpoGo || !hasWebRTC) {
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
          <View style={[styles.lockIconBox, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="phone-portrait-outline" size={40} color="#2563EB" />
          </View>
          <Text style={styles.blockTitle}>Cần development build</Text>
          <Text style={styles.blockDesc}>
            Phòng học WebRTC native không chạy trên Expo Go. Hãy dùng{'\n'}
            npx expo run:android{'\n'}
            hoặc eas build --profile development.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onBack}>
            <Text style={styles.primaryBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Chặn người lạ ──────────────────────────────────────────────────────
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

  const RTCView = getRTCView();
  const statusColor =
    connStatus === STATUS.connected
      ? '#10B981'
      : connStatus === STATUS.disconnected
        ? '#EF4444'
        : '#F59E0B';

  return (
    <SafeAreaView style={styles.container} edges={fullscreen ? [] : ['top']}>
      {!fullscreen && (
        <View style={styles.header}>
          <TouchableOpacity onPress={leaveRoom} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Phòng học · Buổi {sessionNumber}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={styles.headerSub} numberOfLines={1}>
                {subject} · {connStatus}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setFullscreen(true)} style={styles.iconBtn}>
            <Ionicons name="expand-outline" size={22} color="#2563EB" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.videoArea}>
        {RTCView && remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
            mirror={false}
          />
        ) : (
          <View style={styles.remotePlaceholder}>
            <Ionicons name="person-outline" size={48} color="#6B7280" />
            <Text style={styles.placeholderText}>
              {connStatus === STATUS.connected
                ? 'Đối phương đã tắt camera'
                : 'Đang chờ đối phương...'}
            </Text>
          </View>
        )}

        {RTCView && localStream && !camOff ? (
          <View style={styles.pipBox}>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.pipVideo}
              objectFit="cover"
              mirror={facingRef.current === 'user'}
              zOrder={1}
            />
          </View>
        ) : (
          <View style={[styles.pipBox, styles.pipOff]}>
            <Ionicons name="videocam-off" size={20} color="#9CA3AF" />
          </View>
        )}

        {loading && !failed && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Đang khởi tạo camera/mic...</Text>
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

        {fullscreen && (
          <View style={styles.fsBar}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={styles.fsText} numberOfLines={1}>
                Buổi {sessionNumber} · {subject} · {connStatus}
              </Text>
            </View>
            <TouchableOpacity style={styles.fsBtn} onPress={() => setFullscreen(false)}>
              <Ionicons name="contract-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={[styles.controlsBar, fullscreen && styles.controlsBarFs]}>
        <TouchableOpacity
          style={[
            styles.ctrlBtn,
            fullscreen && styles.ctrlBtnFs,
            muted && styles.ctrlBtnActive,
          ]}
          onPress={toggleMute}
        >
          <Ionicons
            name={muted ? 'mic-off' : 'mic'}
            size={20}
            color={muted ? '#EF4444' : fullscreen ? '#fff' : '#111827'}
          />
          <Text style={[styles.ctrlText, fullscreen && styles.ctrlTextFs]}>
            {muted ? 'Bật mic' : 'Tắt mic'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.ctrlBtn,
            fullscreen && styles.ctrlBtnFs,
            camOff && styles.ctrlBtnActive,
          ]}
          onPress={toggleCam}
        >
          <Ionicons
            name={camOff ? 'videocam-off' : 'videocam'}
            size={20}
            color={camOff ? '#EF4444' : fullscreen ? '#fff' : '#111827'}
          />
          <Text style={[styles.ctrlText, fullscreen && styles.ctrlTextFs]}>
            {camOff ? 'Bật cam' : 'Tắt cam'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, fullscreen && styles.ctrlBtnFs]}
          onPress={flipCamera}
          disabled={camOff}
        >
          <Ionicons
            name="camera-reverse-outline"
            size={20}
            color={fullscreen ? '#fff' : '#111827'}
          />
          <Text style={[styles.ctrlText, fullscreen && styles.ctrlTextFs]}>Đổi cam</Text>
        </TouchableOpacity>

        {!fullscreen && (
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => setFullscreen(true)}>
            <Ionicons name="expand-outline" size={18} color="#111827" />
            <Text style={styles.ctrlText}>Fullscreen</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.leaveBtn} onPress={leaveRoom}>
          <Ionicons
            name="call"
            size={18}
            color="#fff"
            style={{ transform: [{ rotate: '135deg' }] }}
          />
          <Text style={styles.leaveText}>Rời phòng</Text>
        </TouchableOpacity>
      </View>
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
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerInfo: { flex: 1, marginLeft: 4 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  videoArea: { flex: 1, backgroundColor: '#0B1220', position: 'relative' },
  remoteVideo: { flex: 1, backgroundColor: '#000' },
  remotePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  placeholderText: { color: '#9CA3AF', fontSize: 14 },
  pipBox: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 110,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: '#111827',
    zIndex: 5,
  },
  pipVideo: { width: '100%', height: '100%' },
  pipOff: { alignItems: 'center', justifyContent: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,18,32,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 32,
  },
  loadingText: { marginTop: 14, fontSize: 14, color: '#9CA3AF' },
  errIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  errTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  errDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 32,
  },
  lockIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  blockTitle: { fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' },
  blockDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  controlsBarFs: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17,24,39,0.88)',
    borderTopWidth: 0,
    zIndex: 20,
  },
  ctrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
  },
  ctrlBtnFs: { backgroundColor: 'rgba(255,255,255,0.12)' },
  ctrlBtnActive: { backgroundColor: '#FEF2F2' },
  ctrlText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  ctrlTextFs: { color: '#fff' },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  leaveText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  fsBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(17,24,39,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 20,
  },
  fsText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600', marginRight: 8 },
  fsBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
