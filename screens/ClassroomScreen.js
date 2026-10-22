import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  NativeModules,
  Platform,
  TextInput,
  ScrollView,
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
  getJoinWindow,
} from '../lib/webrtc/session';
import { subscribeSignaling, sendSignal, clearSignals } from '../lib/webrtc/signaling';
import {
  startClassroomForeground,
  updateClassroomForeground,
  stopClassroomForeground,
} from '../lib/classroomForeground';

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
  const [sharingScreen, setSharingScreen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  // Chat trong phòng (data channel — peer đã có sẵn, nay bổ sung UI)
  const [showChat, setShowChat] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const chatScrollRef = useRef(null);

  const allowed = useMemo(() => isParticipant(user, session), [user?.id, session]);
  // Phòng học tự kiểm tra cửa sổ giờ (mở -15', đóng +30' sau buổi) ngay tại
  // đây, không chỉ dựa vào màn hình danh sách (bổ sung 2026-10-22).
  const joinWin = useMemo(() => getJoinWindow(session), [session]);
  const offerer = useMemo(() => isOfferer(user), [user?.role]);
  const sessionId = session?.id;
  const sessionNumber = session?.session_number || '?';
  const subject = session?.course?.subject || session?.subject || 'Lớp học trực tuyến';

  // Foreground service: giữ WebRTC sống khi app xuống background (Android)
  const durationRef = useRef(0);
  const durationTimerRef = useRef(null);
  const fgStartedRef = useRef(false);

  const cleanup = useCallback(async ({ notifyLeave = false } = {}) => {
    if (offerTimerRef.current) {
      clearInterval(offerTimerRef.current);
      offerTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    // Dừng foreground service ngay khi rời phòng — tránh notification kẹt lại
    if (fgStartedRef.current) {
      fgStartedRef.current = false;
      try { await stopClassroomForeground(); } catch (e) {}
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

  const stopShareThenReconnect = useCallback(() => {
    const peer = peerRef.current;
    if (peer?.sharingScreen || peer?.screenStream) {
      peer
        .stopScreenShare(facingRef.current)
        .then((stream) => {
          if (!mountedRef.current) return;
          setSharingScreen(false);
          if (stream) setLocalStream(stream);
          scheduleReconnect();
        })
        .catch(() => {
          if (!mountedRef.current) return;
          setSharingScreen(false);
          scheduleReconnect();
        });
      return;
    }
    scheduleReconnect();
  }, [scheduleReconnect]);

  const handlePeerEvent = useCallback((event) => {
    if (!mountedRef.current || !event) return;

    if (event.type === 'remotestream' && event.stream) {
      setRemoteStream(event.stream);
    }

    if (event.type === 'chatmessage' && event.message?.text) {
      setChatMessages((prev) => [
        ...prev.slice(-80),
        { from: 'remote', text: event.message.text, at: event.message.at || Date.now() },
      ]);
    }

    if (event.type === 'screenshare') {
      setSharingScreen(!!event.active);
      if (event.stream) setLocalStream(event.stream);
      else if (!event.active && peerRef.current?.localStream) {
        setLocalStream(peerRef.current.localStream);
      }
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
        stopShareThenReconnect();
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
        stopShareThenReconnect();
      }
    }
  }, [stopShareThenReconnect]);

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
    if (!allowed || !joinWin.open || !sessionId || !user?.id) return undefined;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setFailed(false);
      setErrorMsg('');
      setConnStatus(STATUS.connecting);
      setRemoteStream(null);
      setSharingScreen(false);
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

        // Khởi foreground service (Android) để call còn sống khi xuống background
        if (Platform.OS === 'android' && !isExpoGo && !cancelled && mountedRef.current) {
          try {
            await startClassroomForeground({
              sessionId, subject,
              durationSec: 0, muted: false, camOff: false, sharingScreen: false,
            });
            fgStartedRef.current = true;
            durationRef.current = 0;
            if (durationTimerRef.current) clearInterval(durationTimerRef.current);
            durationTimerRef.current = setInterval(() => {
              durationRef.current += 1;
              updateClassroomForeground({
                sessionId, subject,
                durationSec: durationRef.current,
                muted,
                camOff,
                sharingScreen,
              }).catch(() => {});
            }, 5000);
            // Cập nhật ngay khi mic/cam/screen đổi
          } catch (e) {
            console.log('[ClassroomFG] start failed:', e?.message);
          }
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
    if (fgStartedRef.current) {
      updateClassroomForeground({ sessionId, subject, durationSec: durationRef.current, muted: next, camOff, sharingScreen }).catch(() => {});
    }
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
    if (fgStartedRef.current) {
      updateClassroomForeground({ sessionId, subject, durationSec: durationRef.current, muted, camOff: next, sharingScreen }).catch(() => {});
    }
  };

  const flipCamera = async () => {
    const peer = peerRef.current;
    if (!peer || peer.closed || camOff || peer.sharingScreen) return;
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

      await peer.replaceVideoTrack(newTrack);

      facingRef.current = nextFacing;
      setLocalStream(peer.localStream);
      for (const t of camStream.getTracks()) {
        if (t !== newTrack) {
          try { t.stop(); } catch (e) {}
        }
      }
    } catch (e) {
      setErrorMsg(e?.message || 'Không đổi được camera.');
    }
  };

  const sendChatMessage = () => {
    const text = chatText.trim();
    if (!text) return;
    const peer = peerRef.current;
    if (peer && peer.sendChat(text)) {
      setChatMessages((prev) => [...prev.slice(-80), { from: 'me', text, at: Date.now() }]);
      setChatText('');
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  const toggleScreenShare = async () => {
    const peer = peerRef.current;
    if (!peer || peer.closed || Platform.OS !== 'android') return;
    try {
      if (peer.sharingScreen) {
        const stream = await peer.stopScreenShare(facingRef.current);
        setSharingScreen(false);
        setCamOff(false);
        if (stream) setLocalStream(stream);
      } else {
        const stream = await peer.startScreenShare();
        setSharingScreen(true);
        setCamOff(false);
        if (stream) setLocalStream(stream);
      }
      if (fgStartedRef.current) {
        const active = !!peerRef.current?.sharingScreen;
        updateClassroomForeground({ sessionId, subject, durationSec: durationRef.current, muted, camOff: false, sharingScreen: active }).catch(() => {});
      }
    } catch (e) {
      setSharingScreen(!!peerRef.current?.sharingScreen);
      setErrorMsg(e?.message || 'Không chia sẻ được màn hình.');
      if (fgStartedRef.current) {
        updateClassroomForeground({ sessionId, subject, durationSec: durationRef.current, muted, camOff, sharingScreen: !!peerRef.current?.sharingScreen }).catch(() => {});
      }
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
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (fgStartedRef.current) {
      fgStartedRef.current = false;
      try { await stopClassroomForeground(); } catch (e) {}
    }
    await cleanup({ notifyLeave: true });
    onBack();
  };

  // Đồng bộ foreground notification khi duration/mic/cam/screen đổi ngoài toggle (vd. reconnect)
  useEffect(() => {
    if (!fgStartedRef.current) return;
    updateClassroomForeground({ sessionId, subject, durationSec: durationRef.current, muted, camOff, sharingScreen }).catch(() => {});
  }, [muted, camOff, sharingScreen, sessionId, subject]);


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

  // ── Chặn người lạ + chặn ngoài giờ học ─────────────────────────────────
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
          <Text style={styles.blockTitle}>
            {blockedByTime ? 'Chưa tới giờ vào lớp' : 'Bạn không thuộc buổi học này'}
          </Text>
          <Text style={styles.blockDesc}>
            {blockedByTime
              ? joinWin.hint
              : 'Phòng học chỉ dành cho học sinh và gia sư của buổi học.'}
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
              objectFit={sharingScreen ? 'contain' : 'cover'}
              mirror={!sharingScreen && facingRef.current === 'user'}
              zOrder={1}
            />
          </View>
        ) : (
          <View style={[styles.pipBox, styles.pipOff]}>
            <Ionicons name="videocam-off" size={20} color="#9CA3AF" />
          </View>
        )}

        {sharingScreen && (
          <View style={styles.shareBadge}>
            <Ionicons name="desktop-outline" size={14} color="#fff" />
            <Text style={styles.shareBadgeText}>Đang chia sẻ màn hình</Text>
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

      {showChat && !fullscreen && (
        <View style={styles.chatPanel}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Chat trong phòng</Text>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={chatScrollRef}
            style={styles.chatList}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
          >
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
          disabled={camOff || sharingScreen}
        >
          <Ionicons
            name="camera-reverse-outline"
            size={20}
            color={fullscreen ? '#fff' : '#111827'}
          />
          <Text style={[styles.ctrlText, fullscreen && styles.ctrlTextFs]}>Đổi cam</Text>
        </TouchableOpacity>

        {Platform.OS === 'android' && (
          <TouchableOpacity
            style={[
              styles.ctrlBtn,
              fullscreen && styles.ctrlBtnFs,
              sharingScreen && styles.ctrlBtnShareActive,
            ]}
            onPress={toggleScreenShare}
          >
            <Ionicons
              name={sharingScreen ? 'stop-outline' : 'desktop-outline'}
              size={20}
              color={sharingScreen ? '#2563EB' : fullscreen ? '#fff' : '#111827'}
            />
            <Text
              style={[
                styles.ctrlText,
                fullscreen && styles.ctrlTextFs,
                sharingScreen && styles.ctrlTextShareActive,
              ]}
            >
              {sharingScreen ? 'Dừng chia sẻ' : 'Chia sẻ MH'}
            </Text>
          </TouchableOpacity>
        )}

        {!fullscreen && (
          <TouchableOpacity
            style={[styles.ctrlBtn, showChat && styles.ctrlBtnActive]}
            onPress={() => setShowChat((v) => !v)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={showChat ? '#EF4444' : '#111827'} />
            <Text style={styles.ctrlText}>Chat</Text>
          </TouchableOpacity>
        )}

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
  shareBadge: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37,99,235,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    zIndex: 8,
  },
  shareBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
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
  ctrlBtnShareActive: { backgroundColor: '#DBEAFE' },
  ctrlText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  ctrlTextFs: { color: '#fff' },
  ctrlTextShareActive: { color: '#2563EB' },
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
  chatPanel: {
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB',
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, maxHeight: 320,
  },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  chatTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  chatList: { maxHeight: 180 },
  chatEmpty: { fontSize: 12, color: '#9CA3AF', lineHeight: 17, paddingVertical: 6 },
  chatBubble: {
    alignSelf: 'flex-start', maxWidth: '82%', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6, backgroundColor: '#F3F4F6',
  },
  chatBubbleMe: { alignSelf: 'flex-end', backgroundColor: '#2563EB' },
  chatBubbleOther: { alignSelf: 'flex-start' },
  chatBubbleText: { fontSize: 13, color: '#111827', lineHeight: 18 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  chatInput: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9, fontSize: 13, color: '#111827',
  },
  chatSendBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
});
