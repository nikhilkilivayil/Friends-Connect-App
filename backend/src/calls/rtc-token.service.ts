import { Injectable } from '@nestjs/common';

export type CallSessionMode =
  | 'RANDOM_AUDIO'
  | 'RANDOM_VIDEO'
  | 'CELEB_AUDIO'
  | 'CELEB_VIDEO'
  | 'SUPPORT_AUDIO';

export interface WebRtcIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface WebRtcSessionConfig {
  roomName: string;
  participantId: string;
  participantName: string;
  mode: CallSessionMode;
  signalingUrl: string;
  iceServers: WebRtcIceServer[];
  mediaConstraints: {
    audio: boolean;
    video: boolean;
  };
  videoAllowed: boolean;
  audioAllowed: boolean;
}

@Injectable()
export class RtcTokenService {
  private readonly defaultIceServers: WebRtcIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  async createRoomToken(params: {
    roomName: string;
    participantId: string;
    participantName: string;
    mode: CallSessionMode;
  }): Promise<WebRtcSessionConfig> {
    // Strict Enforcement: Customer Care Support (SUPPORT_AUDIO) and *_AUDIO modes NEVER allow camera publishing
    // Only the two *_VIDEO modes may publish a camera track.
    const isVideoAllowed = params.mode === 'RANDOM_VIDEO' || params.mode === 'CELEB_VIDEO';

    const iceServers: WebRtcIceServer[] = [...this.defaultIceServers];
    if (process.env.TURN_URL) {
      iceServers.push({
        urls: process.env.TURN_URL,
        username: process.env.TURN_USERNAME || 'fc_turn_user',
        credential: process.env.TURN_PASSWORD || 'fc_turn_secret',
      });
    }

    return {
      roomName: params.roomName,
      participantId: params.participantId,
      participantName: params.participantName,
      mode: params.mode,
      signalingUrl: process.env.SIGNALING_URL || 'http://localhost:4000',
      iceServers,
      mediaConstraints: {
        audio: true,
        video: isVideoAllowed,
      },
      videoAllowed: isVideoAllowed,
      audioAllowed: true,
    };
  }
}
