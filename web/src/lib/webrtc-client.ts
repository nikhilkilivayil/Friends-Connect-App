import { io, Socket } from 'socket.io-client';

export type WebRtcCallMode =
  | 'RANDOM_AUDIO'
  | 'RANDOM_VIDEO'
  | 'CELEB_AUDIO'
  | 'CELEB_VIDEO'
  | 'SUPPORT_AUDIO';

export interface WebRtcSessionCallbacks {
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onError: (message: string) => void;
}

/**
 * Pure W3C WebRTC Audio & Video Call Client (`RTCPeerConnection` + `navigator.mediaDevices.getUserMedia` + Socket.io Signaling).
 * Enforces the platform rule:
 * - RANDOM_VIDEO & CELEB_VIDEO: Audio + Video tracks (`{ audio: true, video: true }`)
 * - RANDOM_AUDIO & CELEB_AUDIO: Audio track (`{ audio: true, video: false }`)
 * - SUPPORT_AUDIO (Customer Care): Strictly Audio-Only (`video` track is never requested or negotiated)
 */
export class WebRtcCallClient {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private socket: Socket | null = null;
  private roomName: string = '';
  private userId: string = '';
  private callMode: WebRtcCallMode = 'RANDOM_AUDIO';
  private readonly pendingIceCandidates: RTCIceCandidateInit[] = [];

  private readonly defaultIceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  async startCall(params: {
    signalingUrl?: string;
    roomName: string;
    userId: string;
    displayName: string;
    callMode: WebRtcCallMode;
    callbacks: WebRtcSessionCallbacks;
  }): Promise<void> {
    this.roomName = params.roomName;
    this.userId = params.userId;
    this.callMode = params.callMode;

    const isVideoAllowed =
      params.callMode === 'RANDOM_VIDEO' || params.callMode === 'CELEB_VIDEO';

    // 1. Capture Local Audio / Video MediaStream via WebRTC getUserMedia
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: isVideoAllowed
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
            : false,
        });
        params.callbacks.onLocalStream(this.localStream);
      }
    } catch (err: any) {
      params.callbacks.onError(
        `WebRTC Microphone/Camera permission info: ${err?.message || 'Using fallback media stream'}`,
      );
    }

    // 2. Initialize RTCPeerConnection with STUN/TURN ICE servers
    if (typeof window !== 'undefined' && 'RTCPeerConnection' in window) {
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.defaultIceServers,
      });

      this.remoteStream = new MediaStream();

      // Add local tracks to RTCPeerConnection
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          // Security check: Never attach a video track on SUPPORT_AUDIO calls
          if (params.callMode === 'SUPPORT_AUDIO' && track.kind === 'video') {
            track.stop();
            return;
          }
          this.peerConnection?.addTrack(track, this.localStream!);
        });
      }

      // Listen for incoming remote WebRTC tracks
      this.peerConnection.ontrack = (event: RTCTrackEvent) => {
        event.streams[0]?.getTracks().forEach((track) => {
          if (params.callMode === 'SUPPORT_AUDIO' && track.kind === 'video') {
            return; // Ignore any remote video track on support calls
          }
          this.remoteStream?.addTrack(track);
        });
        if (this.remoteStream) {
          params.callbacks.onRemoteStream(this.remoteStream);
        }
      };

      // Relay local ICE candidates via Socket.io signaling server
      this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate && this.socket?.connected) {
          this.socket.emit('webrtc_ice_candidate', {
            roomName: this.roomName,
            senderId: this.userId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        if (this.peerConnection) {
          params.callbacks.onConnectionStateChange(this.peerConnection.connectionState);
        }
      };
    }

    // 3. Connect to Socket.io WebRTC Signaling Server
    const url = params.signalingUrl || process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:4000';
    this.socket = io(url, {
      transports: ['websocket'],
      reconnectionAttempts: 2,
      timeout: 3000,
    });

    this.socket.on('connect', () => {
      this.socket?.emit('webrtc_join_room', {
        roomName: this.roomName,
        userId: this.userId,
        displayName: params.displayName,
        callMode: this.callMode,
      });
    });
    this.socket.on('connect_error', (error: Error) => {
      params.callbacks.onError(`Call signaling is unavailable: ${error.message}`);
      params.callbacks.onConnectionStateChange('failed');
    });

    // When peer joins, create and send WebRTC SDP Offer
    this.socket.on('webrtc_peer_joined', async () => {
      if (!this.peerConnection) return;
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideoAllowed,
      });
      await this.peerConnection.setLocalDescription(offer);

      this.socket?.emit('webrtc_sdp_offer', {
        roomName: this.roomName,
        senderId: this.userId,
        callMode: this.callMode,
        sdp: {
          type: 'offer',
          sdp: offer.sdp || '',
        },
      });
    });

    // When receiving an SDP Offer, setRemoteDescription and reply with SDP Answer
    this.socket.on('webrtc_sdp_offer', async (payload: { sdp: RTCSessionDescriptionInit }) => {
      if (!this.peerConnection) return;
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      await this.flushPendingIceCandidates();
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket?.emit('webrtc_sdp_answer', {
        roomName: this.roomName,
        senderId: this.userId,
        callMode: this.callMode,
        sdp: {
          type: 'answer',
          sdp: answer.sdp || '',
        },
      });
    });

    // When receiving an SDP Answer, complete WebRTC handshake
    this.socket.on('webrtc_sdp_answer', async (payload: { sdp: RTCSessionDescriptionInit }) => {
      if (!this.peerConnection) return;
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      await this.flushPendingIceCandidates();
    });

    // Add trickled remote ICE candidates
    this.socket.on(
      'webrtc_ice_candidate',
      async (payload: { candidate: RTCIceCandidateInit }) => {
        if (!this.peerConnection || !payload.candidate) return;
        if (!this.peerConnection.remoteDescription) {
          this.pendingIceCandidates.push(payload.candidate);
          return;
        }
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
      },
    );
  }

  private async flushPendingIceCandidates() {
    if (!this.peerConnection?.remoteDescription) return;
    for (const candidate of this.pendingIceCandidates.splice(0)) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  toggleAudioMute(muted: boolean): void {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    this.socket?.emit('webrtc_media_state', {
      roomName: this.roomName,
      userId: this.userId,
      audioMuted: muted,
      videoEnabled: this.isVideoEnabled(),
      callMode: this.callMode,
    });
  }

  toggleVideoTrack(enabled: boolean): boolean {
    if (this.callMode === 'SUPPORT_AUDIO') {
      return false; // Video is strictly prohibited on Customer Care Support calls
    }
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
    this.socket?.emit('webrtc_media_state', {
      roomName: this.roomName,
      userId: this.userId,
      audioMuted: false,
      videoEnabled: enabled,
      callMode: this.callMode,
    });
    return enabled;
  }

  isVideoEnabled(): boolean {
    if (this.callMode === 'SUPPORT_AUDIO') return false;
    const videoTracks = this.localStream?.getVideoTracks() || [];
    return videoTracks.length > 0 && videoTracks[0].enabled;
  }

  stopCall(): void {
    if (this.socket?.connected) {
      this.socket.emit('webrtc_leave_room', {
        roomName: this.roomName,
        userId: this.userId,
      });
      this.socket.disconnect();
    }
    this.socket = null;

    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.pendingIceCandidates.length = 0;

    this.peerConnection?.close();
    this.peerConnection = null;
  }
}
