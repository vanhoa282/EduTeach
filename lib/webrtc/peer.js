import { NativeModules } from 'react-native';
import { ICE_SERVERS } from './session';

// Lazy require: react-native-webrtc ném lỗi ngay khi import nếu thiếu native module
// (Expo Go / dev build chưa link). Chỉ require khi chắc chắn module tồn tại.
function getWebRTC() {
  if (!NativeModules.WebRTCModule) {
    throw new Error(
      'Thiếu native module WebRTC. Cần development build (npm install + npx expo run:android hoặc eas build --profile development).'
    );
  }
  return require('react-native-webrtc');
}

// Peer 1-1: bọc RTCPeerConnection cho mô hình 1 gia sư + 1 học sinh.
// - Gia sư (offerer): gửi offer định kỳ cho tới khi connected.
// - Học sinh (answerer): mỗi offer mới (offer_id mới) → tạo pc mới + trả answer.
export class EduTeachPeer {
  constructor({ isOfferer, onEvent }) {
    this.isOfferer = isOfferer;
    this.onEvent = onEvent || (() => {});
    this.pc = null;
    this.localStream = null;
    this.candidatesQueue = [];
    this.dataChannel = null;
    this.closed = false;
  }

  async initLocalMedia(facingMode = 'user') {
    const { mediaDevices } = getWebRTC();
    this.stopLocal();
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode,
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 },
      },
    });
    this.localStream = stream;
    return stream;
  }

  // Lấy camera (chỉ video) — trả về full stream để màn hình tự xử lý.
  async getCameraStream(facingMode) {
    const { mediaDevices } = getWebRTC();
    return mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode,
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 },
      },
    });
  }

  createPc() {
    const { RTCPeerConnection } = getWebRTC();
    this.closePc();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc = pc;
    this.candidatesQueue = [];

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        try { pc.addTrack(track, this.localStream); } catch (e) {}
      }
    }

    pc.onicecandidate = (event) => {
      // Bỏ qua ICE của pc cũ đã bị thay thế.
      if (event && event.candidate && this.pc === pc) {
        // Serialize bằng toJSON() để JSON.stringify khi gửi qua Supabase
        // không bị mất trường (object native có thể stringify thành {}).
        const plain = event.candidate.toJSON
          ? event.candidate.toJSON()
          : {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
            };
        this.onEvent({ type: 'ice', candidate: plain });
      }
    };

    pc.onconnectionstatechange = () => {
      this.onEvent({ type: 'connectionstate', state: pc.connectionState });
    };

    pc.oniceconnectionstatechange = () => {
      this.onEvent({ type: 'iceconnectionstate', state: pc.iceConnectionState });
    };

    pc.ontrack = (event) => {
      let stream = null;
      try {
        stream = event?.streams && event.streams[0];
      } catch (e) {}
      if (!stream && event?.track) {
        try {
          const { MediaStream } = getWebRTC();
          stream = new MediaStream([event.track]);
        } catch (e) {}
      }
      if (stream) {
        this.onEvent({ type: 'remotestream', stream });
      }
    };

    // Data channel: chat trong phòng (offerer tạo, answerer nhận).
    if (this.isOfferer) {
      try {
        const dc = pc.createDataChannel('eduteach-chat', { ordered: true });
        this.wireDataChannel(dc);
      } catch (e) {}
    } else {
      pc.ondatachannel = (event) => {
        if (event?.channel) this.wireDataChannel(event.channel);
      };
    }

    return pc;
  }

  wireDataChannel(dc) {
    this.dataChannel = dc;
    if (!dc) return;
    dc.onopen = () => this.onEvent({ type: 'datachannelopen' });
    dc.onmessage = (event) => {
      try {
        const msg = typeof event?.data === 'string' ? JSON.parse(event.data) : null;
        if (msg && typeof msg.text === 'string' && msg.text.trim()) {
          this.onEvent({ type: 'chatmessage', message: msg });
        }
      } catch (e) {}
    };
  }

  sendChat(text) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return false;
    try {
      this.dataChannel.send(JSON.stringify({ text, at: Date.now() }));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Chia sẻ màn hình (Android: MediaProjection; iOS: chưa hỗ trợ).
  async startScreenShare() {
    const { mediaDevices } = getWebRTC();
    if (typeof mediaDevices.getDisplayMedia !== 'function') {
      throw new Error('Thiết bị này chưa hỗ trợ chia sẻ màn hình (iOS hiện chưa hỗ trợ).');
    }
    const stream = await mediaDevices.getDisplayMedia({ video: true });
    if (!stream || !stream.getVideoTracks().length) {
      throw new Error('Không lấy được màn hình.');
    }
    return stream;
  }

  async sendOffer(offerId) {
    if (!this.pc) this.createPc();
    // Đang chờ answer của offer trước → bỏ qua lượt này.
    if (this.pc.signalingState !== 'stable') return null;
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.pc.setLocalDescription(offer);
    return { sdp: this.pc.localDescription.sdp, offer_id: offerId };
  }

  async handleOffer(payload) {
    const { RTCSessionDescription } = getWebRTC();
    this.createPc();
    await this.pc.setRemoteDescription(
      new RTCSessionDescription({ type: 'offer', sdp: payload.sdp })
    );
    await this.flushCandidates();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return { sdp: this.pc.localDescription.sdp, offer_id: payload.offer_id };
  }

  async handleAnswer(payload) {
    if (!this.pc) return;
    const { RTCSessionDescription } = getWebRTC();
    await this.pc.setRemoteDescription(
      new RTCSessionDescription({ type: 'answer', sdp: payload.sdp })
    );
    await this.flushCandidates();
  }

  async handleIce(payload) {
    if (!this.pc || !payload?.candidate) return;
    try {
      const { RTCIceCandidate } = getWebRTC();
      const candidate = new RTCIceCandidate(payload.candidate);
      if (this.pc.remoteDescription) {
        await this.pc.addIceCandidate(candidate);
      } else {
        this.candidatesQueue.push(candidate);
      }
    } catch (e) {}
  }

  async flushCandidates() {
    const queue = this.candidatesQueue.slice();
    this.candidatesQueue = [];
    for (const c of queue) {
      try { await this.pc.addIceCandidate(c); } catch (e) {}
    }
  }

  closePc() {
    if (this.pc) {
      try { this.pc.close(); } catch (e) {}
      this.pc = null;
    }
    this.dataChannel = null;
    this.candidatesQueue = [];
  }

  stopLocal() {
    if (this.localStream) {
      for (const t of this.localStream.getTracks()) {
        try { t.stop(); } catch (e) {}
      }
      this.localStream = null;
    }
  }

  close() {
    this.closed = true;
    this.closePc();
    this.stopLocal();
  }
}
