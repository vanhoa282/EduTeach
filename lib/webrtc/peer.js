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
    this.screenStream = null;
    this.sharingScreen = false;
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

  // Đổi video track đang gửi (camera ↔ màn hình) mà không đàm phán lại SDP.
  async replaceVideoTrack(newTrack) {
    if (!newTrack) return null;
    const senders = this.pc?.getSenders?.() || [];
    const sender = senders.find((s) => s.track && s.track.kind === 'video');
    if (sender) {
      await sender.replaceTrack(newTrack);
    } else if (this.pc && this.localStream) {
      try { this.pc.addTrack(newTrack, this.localStream); } catch (e) {}
    }
    return newTrack;
  }

  // Chia sẻ màn hình (Android: MediaProjection; iOS: chưa hỗ trợ).
  // Thay video track trên PC + localStream; giữ audio mic như cũ.
  async startScreenShare() {
    if (this.closed) throw new Error('Peer đã đóng.');
    if (this.sharingScreen) return this.localStream;

    const { mediaDevices } = getWebRTC();
    if (typeof mediaDevices.getDisplayMedia !== 'function') {
      throw new Error('Thiết bị này chưa hỗ trợ chia sẻ màn hình (iOS hiện chưa hỗ trợ).');
    }
    const stream = await mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = stream?.getVideoTracks?.()?.[0];
    if (!screenTrack) {
      try {
        for (const t of stream?.getTracks?.() || []) t.stop();
      } catch (e) {}
      throw new Error('Không lấy được màn hình.');
    }

    const oldVideo = this.localStream?.getVideoTracks?.()?.[0];
    if (this.localStream && oldVideo) {
      try { this.localStream.removeTrack(oldVideo); } catch (e) {}
      try { oldVideo.stop(); } catch (e) {}
    }
    if (this.localStream) {
      try { this.localStream.addTrack(screenTrack); } catch (e) {}
    }

    await this.replaceVideoTrack(screenTrack);

    this.screenStream = stream;
    this.sharingScreen = true;

    // User dừng từ notification hệ thống Android → track ended.
    screenTrack.onended = () => {
      if (!this.sharingScreen) return;
      this.stopScreenShare().catch(() => {});
    };

    this.onEvent({ type: 'screenshare', active: true, stream: this.localStream });
    return this.localStream;
  }

  // Dừng chia sẻ màn hình và quay lại camera.
  async stopScreenShare(facingMode = 'user') {
    if (!this.sharingScreen && !this.screenStream) {
      return this.localStream;
    }

    if (this.screenStream) {
      for (const t of this.screenStream.getTracks()) {
        try {
          t.onended = null;
          t.stop();
        } catch (e) {}
      }
      this.screenStream = null;
    }

    // Gỡ video đang có (screen track) khỏi localStream.
    const currentVideo = this.localStream?.getVideoTracks?.()?.[0];
    if (this.localStream && currentVideo) {
      try { this.localStream.removeTrack(currentVideo); } catch (e) {}
      try { currentVideo.stop(); } catch (e) {}
    }

    this.sharingScreen = false;

    if (this.closed) {
      this.onEvent({ type: 'screenshare', active: false, stream: null });
      return null;
    }

    let camTrack = null;
    try {
      const camStream = await this.getCameraStream(facingMode);
      camTrack = camStream?.getVideoTracks?.()?.[0] || null;
      // Dọn container stream (track sẽ gắn vào localStream).
      for (const t of camStream?.getTracks?.() || []) {
        if (t !== camTrack) {
          try { t.stop(); } catch (e) {}
        }
      }
    } catch (e) {
      this.onEvent({ type: 'screenshare', active: false, stream: this.localStream });
      throw e;
    }

    if (camTrack && this.localStream) {
      try { this.localStream.addTrack(camTrack); } catch (e) {}
      await this.replaceVideoTrack(camTrack);
    }

    this.onEvent({ type: 'screenshare', active: false, stream: this.localStream });
    return this.localStream;
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
    if (this.screenStream) {
      for (const t of this.screenStream.getTracks()) {
        try {
          t.onended = null;
          t.stop();
        } catch (e) {}
      }
      this.screenStream = null;
    }
    this.sharingScreen = false;
    this.closePc();
    this.stopLocal();
  }
}
