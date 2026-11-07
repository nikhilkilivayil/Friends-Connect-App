import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CallSessionMode } from './rtc-token.service';

export interface SdpPayload {
  roomName: string;
  senderId: string;
  targetSocketId?: string;
  callMode: CallSessionMode;
  sdp: {
    type: 'offer' | 'answer';
    sdp: string;
  };
}

export interface IceCandidatePayload {
  roomName: string;
  senderId: string;
  candidate: {
    candidate: string;
    sdpMid: string | null;
    sdpMLineIndex: number | null;
  };
}

/**
 * Native WebRTC Signaling Gateway over Socket.io
 * Handles:
 * - Room join / Peer discovery
 * - SDP Offer & Answer exchange (filtering out `m=video` lines on SUPPORT_AUDIO / *_AUDIO sessions)
 * - Trickle ICE Candidate relay
 * - Camera / Microphone track state changes
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class WebRtcSignalingGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('webrtc_join_room')
  handleJoinRoom(
    @MessageBody()
    payload: {
      roomName: string;
      userId: string;
      displayName: string;
      callMode: CallSessionMode;
    },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(payload.roomName);

    // Notify existing peer in the room so they can create and send an RTCPeerConnection SDP Offer
    client.to(payload.roomName).emit('webrtc_peer_joined', {
      roomName: payload.roomName,
      peerId: payload.userId,
      peerSocketId: client.id,
      displayName: payload.displayName,
      callMode: payload.callMode,
    });

    return {
      joined: true,
      roomName: payload.roomName,
      socketId: client.id,
    };
  }

  @SubscribeMessage('webrtc_sdp_offer')
  handleSdpOffer(
    @MessageBody() payload: SdpPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const sanitizedSdp = this.enforceAudioOnlyPolicyOnSdp(
      payload.sdp.sdp,
      payload.callMode,
    );

    client.to(payload.roomName).emit('webrtc_sdp_offer', {
      roomName: payload.roomName,
      senderId: payload.senderId,
      senderSocketId: client.id,
      callMode: payload.callMode,
      sdp: {
        type: 'offer',
        sdp: sanitizedSdp,
      },
    });

    return { relayed: true };
  }

  @SubscribeMessage('webrtc_sdp_answer')
  handleSdpAnswer(
    @MessageBody() payload: SdpPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const sanitizedSdp = this.enforceAudioOnlyPolicyOnSdp(
      payload.sdp.sdp,
      payload.callMode,
    );

    client.to(payload.roomName).emit('webrtc_sdp_answer', {
      roomName: payload.roomName,
      senderId: payload.senderId,
      senderSocketId: client.id,
      callMode: payload.callMode,
      sdp: {
        type: 'answer',
        sdp: sanitizedSdp,
      },
    });

    return { relayed: true };
  }

  @SubscribeMessage('webrtc_ice_candidate')
  handleIceCandidate(
    @MessageBody() payload: IceCandidatePayload,
    @ConnectedSocket() client: Socket,
  ) {
    client.to(payload.roomName).emit('webrtc_ice_candidate', {
      roomName: payload.roomName,
      senderId: payload.senderId,
      candidate: payload.candidate,
    });

    return { relayed: true };
  }

  @SubscribeMessage('webrtc_media_state')
  handleMediaStateChange(
    @MessageBody()
    payload: {
      roomName: string;
      userId: string;
      audioMuted: boolean;
      videoEnabled: boolean;
      callMode: CallSessionMode;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // Customer Care Support (SUPPORT_AUDIO) can never enable video
    const safeVideoEnabled =
      payload.callMode === 'SUPPORT_AUDIO' ? false : payload.videoEnabled;

    client.to(payload.roomName).emit('webrtc_media_state', {
      userId: payload.userId,
      audioMuted: payload.audioMuted,
      videoEnabled: safeVideoEnabled,
    });
  }

  @SubscribeMessage('webrtc_leave_room')
  handleLeaveRoom(
    @MessageBody() payload: { roomName: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(payload.roomName);
    client.to(payload.roomName).emit('webrtc_peer_left', {
      roomName: payload.roomName,
      userId: payload.userId,
    });
    return { left: true };
  }

  /**
   * Security Guard: If the call mode is SUPPORT_AUDIO (Customer Care), RANDOM_AUDIO, or CELEB_AUDIO,
   * strip/reject any video media description in SDP if a modified client attempts to negotiate video.
   */
  private enforceAudioOnlyPolicyOnSdp(sdp: string, mode: CallSessionMode): string {
    const isVideoAllowed = mode === 'RANDOM_VIDEO' || mode === 'CELEB_VIDEO';

    if (isVideoAllowed) {
      return sdp;
    }

    // Reject video m-line in SDP for audio-only modes by setting port to 0
    return sdp.replace(/^m=video \d+/gm, 'm=video 0');
  }
}
