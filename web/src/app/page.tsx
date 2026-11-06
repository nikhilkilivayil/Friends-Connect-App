'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  AudioLines,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Compass,
  Headphones,
  Home,
  LogOut,
  MapPin,
  Shield,
  Sparkles,
  Ticket,
  UserRound,
  Video,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import { WebRtcCallClient } from '../lib/webrtc-client';
import { creatorProfiles, readFollowedCreatorIds, toggleFollowedCreator, type CreatorProfile } from '../lib/creator-data';

type UserRole = 'NORMAL' | 'CELEBRITY' | 'ORG' | 'SUPPORT' | 'SUPER_ADMIN';

const roleItems: Array<{ id: UserRole; label: string; description: string; icon: LucideIcon }> = [
  { id: 'NORMAL', label: 'Discover', description: 'Your social space', icon: Compass },
  { id: 'CELEBRITY', label: 'Creator studio', description: 'Profile & earnings', icon: Sparkles },
  { id: 'ORG', label: 'Events', description: 'Organizer workspace', icon: CalendarDays },
  { id: 'SUPPORT', label: 'Support desk', description: 'Care conversations', icon: Headphones },
  { id: 'SUPER_ADMIN', label: 'Admin', description: 'Account controls', icon: Shield },
];

const roleLinks: Record<UserRole, Array<{ label: string; href: string; icon: LucideIcon }>> = {
  NORMAL: [
    { label: 'Overview', href: '#overview', icon: Home },
    { label: 'Creators', href: '#creators', icon: BadgeCheck },
    { label: 'Events', href: '#events', icon: CalendarDays },
    { label: 'My bookings', href: '#passes', icon: Ticket },
    { label: 'Wallet', href: '#wallet', icon: Wallet },
  ],
  CELEBRITY: [
    { label: 'Profile & rates', href: '#creator-profile', icon: UserRound },
    { label: 'Media studio', href: '#creator-media', icon: Sparkles },
  ],
  ORG: [
    { label: 'Create event', href: '#event-create', icon: CalendarDays },
    { label: 'Published events', href: '#published-events', icon: Home },
  ],
  SUPPORT: [
    { label: 'Support queue', href: '#support-queue', icon: Headphones },
    { label: 'Live chat', href: '#support-chat', icon: AudioLines },
  ],
  SUPER_ADMIN: [{ label: 'User directory', href: '#admin-users', icon: Shield }],
};

const BACKEND_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:4000';

interface UserAccount {
  id: string;
  phoneNumber: string;
  role: UserRole;
  displayName: string;
  status: 'ACTIVE' | 'BLOCKED' | 'RESTRICTED' | 'SUSPENDED';
  restrictions: {
    canRandomAudio: boolean;
    canRandomVideo: boolean;
    canCallCelebrities: boolean;
    maxCallsPerDay: number;
  };
  coinBalance: number;
  earnedCoins: number;
  isPremium: boolean;
}

interface EventItem {
  id: string;
  orgId: string;
  orgName: string;
  title: string;
  description: string;
  venueName: string;
  city: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  startTime: string;
  ticketTiers: Array<{
    id: string;
    name: string;
    priceFiat: number;
    totalCapacity: number;
    soldCount: number;
  }>;
}

interface BookedTicket {
  id: string;
  eventTitle: string;
  tierName: string;
  qrHash: string;
  price: number;
  venueName: string;
  city: string;
  startTime: string;
}

interface ActiveCallSession {
  callId: string;
  status: 'ringing' | 'connecting' | 'active';
  direction: 'caller' | 'creator' | 'other';
  callType: 'RANDOM_AUDIO' | 'RANDOM_VIDEO' | 'CELEB_AUDIO' | 'CELEB_VIDEO' | 'SUPPORT_AUDIO';
  peerName: string;
  peerSubtitle: string;
  videoEnabled: boolean;
  videoPermitted: boolean;
  rateCoinsPerMin: number;
  elapsedSeconds: number;
  coinsCharged: number;
  muted: boolean;
}

interface IncomingCelebrityCall {
  callId: string;
  roomName: string;
  callerId: string;
  callerName: string;
  celebrityId: string;
  mode: 'AUDIO' | 'VIDEO';
  rateCoinsPerMin: number;
}

export default function FriendsConnectApp({ initialCreatorId }: { initialCreatorId?: string } = {}) {
  // 1. Auth & Role State
  const [activeRole, setActiveRole] = useState<UserRole>('NORMAL');
  const [activeNormalSection, setActiveNormalSection] = useState<'overview' | 'creators' | 'events' | 'passes' | 'wallet'>('overview');
  const [selectedAccountId, setSelectedAccountId] = useState('usr-normal-1');
  const [phoneInput, setPhoneInput] = useState('+91 98765 43210');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('123456');
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 2. Platform Data State
  const [users, setUsers] = useState<UserAccount[]>([
    {
      id: 'usr-normal-1',
      phoneNumber: '+91 98765 43210',
      role: 'NORMAL',
      displayName: 'Arjun Nair',
      status: 'ACTIVE',
      restrictions: { canRandomAudio: true, canRandomVideo: true, canCallCelebrities: true, maxCallsPerDay: 50 },
      coinBalance: 650,
      earnedCoins: 0,
      isPremium: true,
    },
    {
      id: 'usr-normal-2',
      phoneNumber: '+91 98765 43211',
      role: 'NORMAL',
      displayName: 'Meera Krishnan',
      status: 'ACTIVE',
      restrictions: { canRandomAudio: true, canRandomVideo: true, canCallCelebrities: true, maxCallsPerDay: 50 },
      coinBalance: 180,
      earnedCoins: 0,
      isPremium: false,
    },
    {
      id: 'usr-celeb-1',
      phoneNumber: '+91 99999 00001',
      role: 'CELEBRITY',
      displayName: 'Dulquer Sithara',
      status: 'ACTIVE',
      restrictions: { canRandomAudio: true, canRandomVideo: true, canCallCelebrities: true, maxCallsPerDay: 100 },
      coinBalance: 1000,
      earnedCoins: 14500,
      isPremium: true,
    },
    {
      id: 'usr-celeb-2',
      phoneNumber: '+91 99999 00005',
      role: 'CELEBRITY',
      displayName: 'Ananya Menon',
      status: 'ACTIVE',
      restrictions: { canRandomAudio: true, canRandomVideo: true, canCallCelebrities: true, maxCallsPerDay: 100 },
      coinBalance: 500,
      earnedCoins: 8900,
      isPremium: true,
    },
    {
      id: 'usr-org-1',
      phoneNumber: '+91 99999 00002',
      role: 'ORG',
      displayName: 'Kochi Events Team',
      status: 'ACTIVE',
      restrictions: { canRandomAudio: false, canRandomVideo: false, canCallCelebrities: false, maxCallsPerDay: 0 },
      coinBalance: 0,
      earnedCoins: 0,
      isPremium: false,
    },
    {
      id: 'usr-support-1',
      phoneNumber: '+91 99999 00003',
      role: 'SUPPORT',
      displayName: 'Customer Care',
      status: 'ACTIVE',
      restrictions: { canRandomAudio: false, canRandomVideo: false, canCallCelebrities: false, maxCallsPerDay: 0 },
      coinBalance: 0,
      earnedCoins: 0,
      isPremium: false,
    },
    {
      id: 'usr-admin-1',
      phoneNumber: '+91 99999 00004',
      role: 'SUPER_ADMIN',
      displayName: 'Super Admin',
      status: 'ACTIVE',
      restrictions: { canRandomAudio: false, canRandomVideo: false, canCallCelebrities: false, maxCallsPerDay: 0 },
      coinBalance: 0,
      earnedCoins: 0,
      isPremium: false,
    },
  ]);

  const currentUser = users.find((user) => user.id === selectedAccountId) ?? users[0];

  const [celebrities, setCelebrities] = useState<CreatorProfile[]>(creatorProfiles);
  const [followedCreatorIds, setFollowedCreatorIds] = useState<string[]>([]);
  const selectedCreator = celebrities.find((creator) => creator.userId === initialCreatorId);
  const currentCreator = celebrities.find((creator) => creator.userId === currentUser.id) ?? celebrities[0];

  const [selectedCity, setSelectedCity] = useState<'ALL' | 'Kochi' | 'Kozhikode' | 'Trivandrum'>('ALL');
  const [maxRadiusKm, setMaxRadiusKm] = useState<number>(100);
  const [events, setEvents] = useState<EventItem[]>([
    {
      id: 'evt-1',
      orgId: 'usr-org-1',
      orgName: 'Kochi Live Arena Events Pvt Ltd',
      title: 'Kochi Sunset Music & Indie Fest 2026',
      description: 'Open-air live concert featuring top bands, celebrity meetups, and food carnival.',
      venueName: 'Bolgatty Palace Grounds',
      city: 'Kochi',
      latitude: 9.9816,
      longitude: 76.2673,
      distanceKm: 4.2,
      startTime: '2026-11-15T17:30:00',
      ticketTiers: [
        { id: 't-1', name: 'General Access', priceFiat: 499, totalCapacity: 500, soldCount: 312 },
        { id: 't-2', name: 'VIP Fan Pit', priceFiat: 1499, totalCapacity: 100, soldCount: 74 },
      ],
    },
    {
      id: 'evt-2',
      orgId: 'usr-org-1',
      orgName: 'Kochi Live Arena Events Pvt Ltd',
      title: 'Malabar Creators & Tech Conclave',
      description: 'Meet digital creators, filmmakers, and music artists at Calicut Beach Arena.',
      venueName: 'Calicut Trade Centre',
      city: 'Kozhikode',
      latitude: 11.2588,
      longitude: 75.7804,
      distanceKm: 42.8,
      startTime: '2026-11-22T10:00:00',
      ticketTiers: [
        { id: 't-3', name: 'Standard Pass', priceFiat: 299, totalCapacity: 300, soldCount: 140 },
        { id: 't-4', name: 'Creator VIP Lounge', priceFiat: 999, totalCapacity: 50, soldCount: 29 },
      ],
    },
  ]);

  const [bookedTickets, setBookedTickets] = useState<BookedTicket[]>([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);

  const [supportMessages, setSupportMessages] = useState<
    Array<{ id: string; sender: string; role: string; text: string; time: string }>
  >([
    {
      id: 'm1',
      sender: 'Rahul (Customer Care Support)',
      role: 'SUPPORT',
      text: 'Welcome to Friends Connect 24x7 Support! Normal Users & Celebrities can chat or start an Audio-Only Support Call anytime.',
      time: '10:15 AM',
    },
  ]);
  const [chatDraft, setChatDraft] = useState('');

  // Organization new event form
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventCity, setNewEventCity] = useState('Kochi');
  const [newEventVenue, setNewEventVenue] = useState('');
  const [newEventPrice, setNewEventPrice] = useState(499);

  // Celebrity new media form
  const [newMediaType, setNewMediaType] = useState<'PHOTO' | 'VIDEO'>('PHOTO');
  const [newMediaCaption, setNewMediaCaption] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800');

  // Active Call Modal, Timer & Native WebRTC Engine
  const [activeCall, setActiveCall] = useState<ActiveCallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCelebrityCall | null>(null);
  const [rtcConnectionState, setRtcConnectionState] = useState<string>('new');
  const [callSignalingReady, setCallSignalingReady] = useState(false);
  const callDialogRef = useRef<HTMLDialogElement | null>(null);
  const incomingCallDialogRef = useRef<HTMLDialogElement | null>(null);
  const callSocketRef = useRef<Socket | null>(null);
  const activeCallRef = useRef<ActiveCallSession | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const billedMinuteKeysRef = useRef<Set<string>>(new Set());
  const webrtcClientRef = useRef<WebRtcCallClient | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const toggleCreatorFollow = (creatorId: string) => {
    const nextFollowed = toggleFollowedCreator(creatorId);
    setFollowedCreatorIds(nextFollowed);
  };

  useEffect(() => {
    setFollowedCreatorIds(readFollowedCreatorIds());
    const storedAccount = window.sessionStorage.getItem('friends-connect:demo-account');
    if (storedAccount && users.some((user) => user.id === storedAccount)) {
      const account = users.find((user) => user.id === storedAccount);
      setSelectedAccountId(storedAccount);
      if (account) setActiveRole(account.role);
    }
    const syncFollows = () => setFollowedCreatorIds(readFollowedCreatorIds());
    window.addEventListener('storage', syncFollows);
    return () => window.removeEventListener('storage', syncFollows);
  }, []);

  useEffect(() => {
    try {
      const storedBookings = JSON.parse(window.localStorage.getItem('friends-connect:bookings') || '[]');
      if (Array.isArray(storedBookings)) {
        setBookedTickets(storedBookings.filter((item): item is BookedTicket => item && typeof item.id === 'string' && typeof item.eventTitle === 'string' && typeof item.tierName === 'string' && typeof item.qrHash === 'string' && typeof item.price === 'number' && typeof item.venueName === 'string' && typeof item.city === 'string' && typeof item.startTime === 'string'));
      }
    } catch {
      setBookedTickets([]);
    }
    setBookingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!bookingsLoaded) return;
    try {
      window.localStorage.setItem('friends-connect:bookings', JSON.stringify(bookedTickets));
    } catch {
      // Keep the booking list usable for this session if local storage is unavailable.
    }
  }, [bookedTickets, bookingsLoaded]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    if (!isLoggedIn) {
      setCallSignalingReady(false);
      callSocketRef.current?.disconnect();
      callSocketRef.current = null;
      return;
    }

    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 3,
      timeout: 3000,
    });
    callSocketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('call_register', { userId: currentUser.id }, (result: { registered?: boolean; error?: string }) => {
        setCallSignalingReady(Boolean(result?.registered));
        if (result?.error) notify(result.error);
        if (result?.registered) {
          fetch(`${BACKEND_URL}/api/celebrities`)
            .then((response) => response.ok ? response.json() : Promise.reject(new Error('Creator profiles could not be loaded.')))
            .then((profiles: CreatorProfile[]) => setCelebrities(profiles))
            .catch(() => notify('Creator cards are showing saved sample profiles because the backend profile request failed.'));
        }
      });
    });
    socket.on('connect_error', () => {
      setCallSignalingReady(false);
    });
    socket.on('disconnect', () => setCallSignalingReady(false));
    socket.on('creator_presence_snapshot', (snapshot: Array<{ creatorId: string; status: CreatorProfile['availability'] }>) => {
      const statusById = new Map(snapshot.map((item) => [item.creatorId, item.status]));
      setCelebrities((items) => items.map((creator) => ({
        ...creator,
        availability: statusById.get(creator.userId) ?? creator.availability,
      })));
    });
    socket.on('creator_presence', ({ creatorId, status }: { creatorId: string; status: CreatorProfile['availability'] }) => {
      setCelebrities((items) => items.map((creator) => creator.userId === creatorId
        ? { ...creator, availability: status }
        : creator));
    });
    socket.on('call_incoming_celebrity', (payload: IncomingCelebrityCall) => {
      if (payload.celebrityId === currentUser.id) setIncomingCall(payload);
    });
    socket.on('match_found', (payload: { roomName: string; mode: 'AUDIO' | 'VIDEO'; peer: { userId: string; displayName: string } }) => {
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
      setActiveCall((current) => current && current.callType.startsWith('RANDOM')
        ? { ...current, callId: payload.roomName, status: 'connecting', peerName: payload.peer.displayName, peerSubtitle: `Matched for a ${payload.mode.toLowerCase()} conversation` }
        : current);
    });
    socket.on('call_celebrity_cancelled', ({ callId }: { callId: string }) => {
      setIncomingCall((current) => current?.callId === callId ? null : current);
    });
    socket.on('call_celebrity_accepted', (payload: { callId: string; roomName: string; celebrityId: string; celebrityName: string; rateCoinsPerMin: number; remainingCoinBalance: number }) => {
      const current = activeCallRef.current;
      if (!current || current.callId !== payload.callId) return;
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
      setUsers((accountList) => accountList.map((account) => account.id === currentUser.id
        ? { ...account, coinBalance: payload.remainingCoinBalance }
        : account));
      setActiveCall({ ...current, status: 'connecting', peerName: payload.celebrityName, peerSubtitle: 'Creator accepted · Connecting securely', rateCoinsPerMin: payload.rateCoinsPerMin, coinsCharged: payload.rateCoinsPerMin });
    });
    socket.on('call_celebrity_started', (payload: { earnedCoins: number }) => {
      setUsers((accountList) => accountList.map((account) => account.id === currentUser.id
        ? { ...account, earnedCoins: payload.earnedCoins }
        : account));
    });
    socket.on('call_celebrity_earnings', (payload: { earnedCoins: number }) => {
      setUsers((accountList) => accountList.map((account) => account.id === currentUser.id
        ? { ...account, earnedCoins: payload.earnedCoins }
        : account));
    });
    socket.on('call_celebrity_rejected', ({ callId, message }: { callId: string; message?: string }) => {
      const current = activeCallRef.current;
      if (current?.callId !== callId || current.status !== 'ringing') return;
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
      notify(message || 'The creator is unavailable or declined the call.');
      setActiveCall(null);
    });
    socket.on('call_celebrity_ended', ({ callId, reason }: { callId: string; reason?: string }) => {
      if (activeCallRef.current?.callId !== callId) return;
      webrtcClientRef.current?.stopCall();
      notify(reason || 'The other participant ended the call.');
      setActiveCall(null);
    });

    return () => {
      socket.disconnect();
      if (callSocketRef.current === socket) callSocketRef.current = null;
      setCallSignalingReady(false);
    };
  }, [isLoggedIn, currentUser.id]);

  useEffect(() => {
    if (incomingCall && incomingCallDialogRef.current && !incomingCallDialogRef.current.open) {
      incomingCallDialogRef.current.showModal();
    } else if (!incomingCall && incomingCallDialogRef.current?.open) {
      incomingCallDialogRef.current.close();
    }
  }, [incomingCall]);

  useEffect(() => {
    if (!activeCall) {
      webrtcClientRef.current?.stopCall();
      webrtcClientRef.current = null;
      setRtcConnectionState('closed');
      if (callDialogRef.current?.open) {
        callDialogRef.current.close();
      }
      return;
    }

    if (callDialogRef.current && !callDialogRef.current.open) {
      callDialogRef.current.showModal();
    }

    // Initialize real W3C WebRTC PeerConnection & getUserMedia stream when a new call starts
    if (activeCall.status !== 'ringing' && !webrtcClientRef.current) {
      const client = new WebRtcCallClient();
      webrtcClientRef.current = client;
      setRtcConnectionState('connecting');

      client.startCall({
        roomName: activeCall.callId,
        userId: currentUser.id,
        displayName: currentUser.displayName,
        callMode: activeCall.callType,
        callbacks: {
          onLocalStream: (stream) => {
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          },
          onRemoteStream: (stream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream;
            }
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = stream;
            }
          },
          onConnectionStateChange: (state) => {
            setRtcConnectionState(state);
            if (state === 'connected') {
              setActiveCall((current) => current ? { ...current, status: 'active' } : null);
            }
          },
          onError: (msg) => {
            notify(msg);
          },
        },
      });
    }

    const timer = setInterval(() => {
      setActiveCall((prev) => {
        if (!prev) return null;
        if (prev.status !== 'active') return prev;
        const nextSec = prev.elapsedSeconds + 1;
        // Per-minute metering check for celebrity calls every 60s
        if (prev.rateCoinsPerMin > 0 && nextSec % 60 === 0) {
          if (prev.direction === 'caller') {
            const tickKey = `${prev.callId}:${Math.floor(nextSec / 60)}`;
            if (!billedMinuteKeysRef.current.has(tickKey)) {
              billedMinuteKeysRef.current.add(tickKey);
              callSocketRef.current?.emit('call_tick_celebrity', { callId: prev.callId }, (result: { ended?: boolean; remainingCoinBalance?: number; totalCoinsCharged?: number; error?: string }) => {
              if (result?.error) {
                notify(result.error);
                webrtcClientRef.current?.stopCall();
                setActiveCall(null);
                return;
              }
              if (result?.ended) {
                webrtcClientRef.current?.stopCall();
                setActiveCall(null);
                return;
              }
              if (typeof result?.remainingCoinBalance === 'number') {
                setUsers((uList) => uList.map((user) => user.id === currentUser.id
                  ? { ...user, coinBalance: result.remainingCoinBalance! }
                  : user));
              }
              if (typeof result?.totalCoinsCharged === 'number') {
                setActiveCall((current) => current?.callId === prev.callId
                  ? { ...current, coinsCharged: result.totalCoinsCharged! }
                  : current);
              }
              });
            }
          }
          return {
            ...prev,
            elapsedSeconds: nextSec,
          };
        }
        return { ...prev, elapsedSeconds: nextSec };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeCall, currentUser.id, currentUser.displayName]);

  // Call Starters enforcing the exact Call Matrix
  const startRandomMatchCall = (mode: 'AUDIO' | 'VIDEO') => {
    if (currentUser.status !== 'ACTIVE') {
      notify(`Account is ${currentUser.status}. Contact Customer Care Support.`);
      return;
    }
    if (mode === 'AUDIO' && !currentUser.restrictions.canRandomAudio) {
      notify('Super Admin has restricted Random Audio Calls on your account.');
      return;
    }
    if (mode === 'VIDEO' && !currentUser.restrictions.canRandomVideo) {
      notify('Super Admin has restricted Random Video Calls on your account.');
      return;
    }
    const socket = callSocketRef.current;
    if (!socket?.connected || !callSignalingReady) {
      notify('Call server is offline. Start the Friends Connect backend, then try again.');
      return;
    }
    const callId = `random-${currentUser.id}-${Date.now()}`;
    setActiveCall({
      callId,
      status: 'ringing',
      direction: 'other',
      callType: mode === 'VIDEO' ? 'RANDOM_VIDEO' : 'RANDOM_AUDIO',
      peerName: 'Finding someone new',
      peerSubtitle: `Looking for an ${mode.toLowerCase()} call partner`,
      videoEnabled: mode === 'VIDEO',
      videoPermitted: true,
      rateCoinsPerMin: 0,
      elapsedSeconds: 0,
      coinsCharged: 0,
      muted: false,
    });
    socket.emit('join_random_queue', { userId: currentUser.id, mode }, (result: { status?: string; error?: string }) => {
      if (result?.error) {
        setActiveCall((current) => current?.callId === callId ? null : current);
        notify(result.error);
      }
    });
    callTimeoutRef.current = setTimeout(() => {
      setActiveCall((current) => {
        if (current?.callId !== callId || current.status !== 'ringing') return current;
        socket.emit('leave_random_queue', { userId: currentUser.id });
        notify('No match found just now. Try again in a moment.');
        return null;
      });
    }, 45000);
  };

  const startCelebrityCall = (celeb: CreatorProfile, mode: 'AUDIO' | 'VIDEO') => {
    if (!currentUser.restrictions.canCallCelebrities) {
      notify('Super Admin has restricted Celebrity Calls on your account.');
      return;
    }
    const rate = mode === 'VIDEO' ? celeb.videoRateCoinsPerMin : celeb.audioRateCoinsPerMin;
    if (currentUser.coinBalance < rate) {
      notify(
        `Insufficient Wallet Coins! Need ${rate} coins/min for ${mode} call with ${celeb.displayName}. Recharge your wallet first.`,
      );
      return;
    }
    const socket = callSocketRef.current;
    if (!socket?.connected || !callSignalingReady) {
      notify('Call server is offline. Start the Friends Connect backend, then try again.');
      return;
    }
    const callId = `celeb-${currentUser.id}-${Date.now()}`;
    setActiveCall({
      callId,
      status: 'ringing',
      direction: 'caller',
      callType: mode === 'VIDEO' ? 'CELEB_VIDEO' : 'CELEB_AUDIO',
      peerName: celeb.displayName,
      peerSubtitle: 'Calling creator · Waiting for them to answer',
      videoEnabled: mode === 'VIDEO',
      videoPermitted: mode === 'VIDEO',
      rateCoinsPerMin: rate,
      elapsedSeconds: 0,
      coinsCharged: 0,
      muted: false,
    });
    socket.emit('call_request_celebrity', {
      callId,
      roomName: callId,
      celebrityId: celeb.userId,
      mode,
      rateCoinsPerMin: rate,
    }, (result: { ringing?: boolean; error?: string }) => {
      if (result?.error) {
        setActiveCall((current) => current?.callId === callId ? null : current);
        notify(result.error);
      }
    });
    callTimeoutRef.current = setTimeout(() => {
      setActiveCall((current) => {
        if (current?.callId !== callId || current.status !== 'ringing') return current;
        socket.emit('call_cancel_celebrity', { callId });
        notify('No answer from the creator. You were not charged.');
        return null;
      });
    }, 35000);
  };

  const respondToIncomingCall = (accepted: boolean) => {
    if (!incomingCall) return;
    const call = incomingCall;
    callSocketRef.current?.emit('call_respond_celebrity', { callId: call.callId, accepted });
    setIncomingCall(null);
    if (!accepted) return;
    setActiveCall({
      callId: call.roomName,
      status: 'connecting',
      direction: 'creator',
      callType: call.mode === 'VIDEO' ? 'CELEB_VIDEO' : 'CELEB_AUDIO',
      peerName: call.callerName,
      peerSubtitle: `Caller connected · ${call.mode.toLowerCase()} call`,
      videoEnabled: call.mode === 'VIDEO',
      videoPermitted: call.mode === 'VIDEO',
      rateCoinsPerMin: 0,
      elapsedSeconds: 0,
      coinsCharged: 0,
      muted: false,
    });
  };

  const endActiveCall = () => {
    if (!activeCall) return;
    if (activeCall.callType === 'RANDOM_AUDIO' || activeCall.callType === 'RANDOM_VIDEO') {
      if (activeCall.status === 'ringing') callSocketRef.current?.emit('leave_random_queue', { userId: currentUser.id });
    } else if (activeCall.status === 'ringing') {
      callSocketRef.current?.emit('call_cancel_celebrity', { callId: activeCall.callId });
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    } else if (activeCall.callType === 'CELEB_AUDIO' || activeCall.callType === 'CELEB_VIDEO') {
      callSocketRef.current?.emit('call_end_celebrity', { callId: activeCall.callId });
    }
    webrtcClientRef.current?.stopCall();
    setActiveCall(null);
  };

  const startCustomerCareAudioCall = (callerLabel: string) => {
    // Strictly Audio-Only — Video is NEVER allowed with Customer Care Support
    setActiveCall({
      callId: `sup-${Date.now()}`,
      status: 'connecting',
      direction: 'other',
      callType: 'SUPPORT_AUDIO',
      peerName: 'Customer Care Support Desk',
      peerSubtitle: `Support preview for ${callerLabel} • Audio only`,
      videoEnabled: false,
      videoPermitted: false,
      rateCoinsPerMin: 0,
      elapsedSeconds: 0,
      coinsCharged: 0,
      muted: false,
    });
  };

  const filteredEvents = events.filter(
    (e) =>
      (selectedCity === 'ALL' || e.city === selectedCity) &&
      e.distanceKm <= maxRadiusKm,
  );

  const handleSectionNavigation = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (activeRole !== 'NORMAL' || initialCreatorId) return;
    event.preventDefault();
    const section = href.replace('#', '') as typeof activeNormalSection;
    setActiveNormalSection(section);
  };

  const sectionHref = (href: string) => initialCreatorId ? `/${href}` : href;

  const addEventBooking = (eventItem: EventItem, tier: EventItem['ticketTiers'][number]) => {
    const reference = `FC-${Date.now().toString(36).toUpperCase()}`;
    setBookedTickets((current) => [{
      id: reference,
      eventTitle: eventItem.title,
      tierName: tier.name,
      qrHash: reference,
      price: tier.priceFiat,
      venueName: eventItem.venueName,
      city: eventItem.city,
      startTime: eventItem.startTime,
    }, ...current]);
    setActiveNormalSection('passes');
    notify('Added to My bookings. Demo only; no payment was processed.');
  };

  return (
    <div className="app-shell min-h-screen bg-[#090d16] text-slate-100 theme-dark">
      {isLoggedIn && (
        <aside className="workspace-sidebar">
          <a className="brand-lockup" href={sectionHref('#overview')} onClick={(event) => handleSectionNavigation(event, '#overview')} aria-label="Friends Connect home">
            <span className="brand-mark">FC</span>
            <span className="brand-copy"><strong>Friends Connect</strong><small>Moments made social</small></span>
          </a>

          <div className="sidebar-preview"><span className="status-dot" /> Demo workspace</div>

          <div className="sidebar-label">WORKSPACES</div>
          <nav className="sidebar-roles" aria-label="Switch workspace">
            {roleItems.filter((role) => role.id === currentUser.role).map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  onClick={() => setActiveRole(role.id)}
                  className={`sidebar-role ${activeRole === role.id ? 'is-active' : ''}`}
                  aria-current={activeRole === role.id ? 'page' : undefined}
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span><strong>{role.label}</strong><small>{role.description}</small></span>
                  {activeRole === role.id && <ChevronRight size={15} />}
                </button>
              );
            })}
          </nav>

          <div className="sidebar-label sidebar-links-label">THIS SPACE</div>
          <nav className="sidebar-links" aria-label="Page sections">
            {roleLinks[activeRole].map((link) => {
              const Icon = link.icon;
              const isActive = activeRole === 'NORMAL' && activeNormalSection === link.href.slice(1);
              return <a key={link.href} href={sectionHref(link.href)} onClick={(event) => handleSectionNavigation(event, link.href)} className={isActive ? 'is-active' : ''} aria-current={isActive ? 'page' : undefined}><Icon size={16} strokeWidth={1.8} />{link.label}</a>;
            })}
          </nav>

          <div className="sidebar-account">
            <div className="account-avatar">{currentUser.displayName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
            <div className="account-copy"><strong>{currentUser.displayName}</strong><small>Preview account</small></div>
            <button onClick={() => { endActiveCall(); setIncomingCall(null); setIsLoggedIn(false); }} aria-label="Sign out of preview" title="Sign out"><LogOut size={15} /></button>
          </div>
        </aside>
      )}

      <div className="workspace-content">
        <header className="app-header">
          <div className="header-inner">
            <div className="topbar-title">
              <span className="topbar-eyebrow">FRIENDS CONNECT <span>/</span> {isLoggedIn ? 'WORKSPACE' : 'WELCOME'}</span>
              <h1>{isLoggedIn ? selectedCreator?.displayName ?? (activeRole === 'NORMAL' ? roleLinks.NORMAL.find((link) => link.href === `#${activeNormalSection}`)?.label ?? 'Discover' : roleItems.find((role) => role.id === activeRole)?.label) : 'Meet someone new'}</h1>
            </div>

            <div className="header-actions">
              {isLoggedIn && (
                <div className="coin-pill" title={`${currentUser.coinBalance} demo coins`}>
                  <span className="coin-icon">◉</span><strong>{currentUser.coinBalance}</strong><span>coins</span>
                </div>
              )}
              <button className="account-button" onClick={() => {
                if (isLoggedIn) { endActiveCall(); setIncomingCall(null); setIsLoggedIn(false); }
                else document.getElementById('login-account')?.focus();
              }}>
                <span className="account-avatar-small">{isLoggedIn ? currentUser.displayName.charAt(0).toUpperCase() : '→'}</span>
                <span>{isLoggedIn ? 'Account' : 'Sign in'}</span>
              </button>
            </div>
          </div>

          {isLoggedIn && (
            <nav className="mobile-role-switcher" aria-label="Switch workspace">
              {roleItems.filter((role) => role.id === currentUser.role).map((role) => {
                const Icon = role.icon;
                return <button key={role.id} onClick={() => setActiveRole(role.id)} className={activeRole === role.id ? 'is-active' : ''} aria-current={activeRole === role.id ? 'page' : undefined}><Icon size={15} />{role.label}</button>;
              })}
            </nav>
          )}
          {isLoggedIn && (
            <nav className="mobile-section-nav" aria-label="Page sections">
              {roleLinks[activeRole].map((link) => {
                const Icon = link.icon;
                const isActive = activeRole === 'NORMAL' && activeNormalSection === link.href.slice(1);
                return <a key={link.href} href={sectionHref(link.href)} onClick={(event) => handleSectionNavigation(event, link.href)} className={isActive ? 'is-active' : ''} aria-current={isActive ? 'page' : undefined}><Icon size={17} /><span>{link.label}</span></a>;
              })}
            </nav>
          )}
        </header>

      {/* Toast Notification */}
      {toastMessage && <div role="status" className="toast-notification">{toastMessage}</div>}

      {/* Mobile OTP Login Banner (if logged out) */}
      {!isLoggedIn && (
        <main className="auth-landing">
          <section className="auth-story">
            <span className="eyebrow-pill"><Sparkles size={14} /> A more human kind of social</span>
            <h2>Your next favourite person is one hello away.</h2>
            <div className="auth-feature-list">
              <span><AudioLines size={16} /> Voice & video</span>
              <span><BadgeCheck size={16} /> Creator connections</span>
              <span><CalendarDays size={16} /> Events nearby</span>
            </div>
          </section>
          <section className="auth-card">
            <div className="auth-card-heading"><span className="brand-mark">FC</span><span className="sidebar-preview"><span className="status-dot" /> Preview mode</span></div>
            <h2>Welcome back</h2>
            <div className="auth-form">
              <label htmlFor="login-account">Choose a demo account</label>
              <select
                id="login-account"
                value={selectedAccountId}
                onChange={(event) => {
                  const account = users.find((user) => user.id === event.target.value);
                  if (!account) return;
                  setSelectedAccountId(account.id);
                  window.sessionStorage.setItem('friends-connect:demo-account', account.id);
                  setPhoneInput(account.phoneNumber);
                  setActiveRole(account.role);
                  setOtpSent(false);
                }}
              >
                <optgroup label="Community">
                  {users.filter((user) => user.role === 'NORMAL').map((user) => <option key={user.id} value={user.id}>{user.displayName} · Normal user</option>)}
                </optgroup>
                <optgroup label="Workspaces">
                  {users.filter((user) => user.role !== 'NORMAL').map((user) => <option key={user.id} value={user.id}>{user.displayName} · {roleItems.find((role) => role.id === user.role)?.label}</option>)}
                </optgroup>
              </select>
              <label htmlFor="login-phone">Mobile number</label>
              <input id="login-phone" type="tel" autoComplete="tel" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} />
              {otpSent && (
                <>
                  <label htmlFor="login-otp">6-digit demo code</label>
                  <input id="login-otp" type="text" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} />
                  <p className="demo-note">Use <strong>123456</strong>. No SMS is sent in this preview.</p>
                </>
              )}
              <button className="primary-button auth-submit" onClick={() => {
                if (!otpSent) {
                  setOtpSent(true);
                  notify('Demo code ready: 123456. No SMS was sent.');
                } else if (otpInput === '123456') {
                  setActiveRole(currentUser.role);
                  setIsLoggedIn(true);
                  setOtpSent(false);
                  notify('Demo workspace opened. No real session was created.');
                } else {
                  notify('That demo code does not match. Use 123456.');
                }
              }}>
                {otpSent ? 'Continue to preview' : 'Show demo code'}<ChevronRight size={16} />
              </button>
            </div>
          </section>
        </main>
      )}

      {/* Main Content Area by Active Role */}
      {isLoggedIn && <main className="app-main max-w-7xl w-full mx-auto px-4 py-6 space-y-8">
        {/* =====================================================================
            ROLE 1: NORMAL USER WORKSPACE
           ===================================================================== */}
        {activeRole === 'NORMAL' && initialCreatorId && (
          selectedCreator ? (
            <div className="creator-profile-page">
              <Link href="/#creators" className="profile-back-link"><ChevronRight size={16} className="rotate-180" /> Back to creators</Link>
              <section className="creator-profile-hero">
                <div className="creator-profile-identity">
                  <img className="creator-profile-avatar" src={selectedCreator.avatarUrl} alt={selectedCreator.displayName} />
                  <div className="creator-profile-copy">
                    <div className="creator-name-line">
                      <h2>{selectedCreator.displayName}</h2>
                      {selectedCreator.isVerified && <BadgeCheck size={20} fill="currentColor" aria-label="Verified creator" />}
                    </div>
                    <p>{selectedCreator.category}</p>
                    <div className="creator-profile-stats">
                      <span><strong>{(selectedCreator.followersCount + (followedCreatorIds.includes(selectedCreator.userId) ? 1 : 0)).toLocaleString()}</strong> followers</span>
                      <span><strong>{selectedCreator.media.length}</strong> posts</span>
                      <span className={`presence-pill presence-${selectedCreator.availability.toLowerCase()}`}><i />{selectedCreator.availability}</span>
                    </div>
                  </div>
                </div>
                <p className="creator-profile-bio">{selectedCreator.bio}</p>
                <div className="creator-profile-actions">
                  <button className={`follow-button ${followedCreatorIds.includes(selectedCreator.userId) ? 'is-following' : ''}`} onClick={() => toggleCreatorFollow(selectedCreator.userId)}>
                    {followedCreatorIds.includes(selectedCreator.userId) ? 'Following' : 'Follow'}
                  </button>
                  <span className={`call-server-badge ${callSignalingReady ? 'is-ready' : 'is-offline'}`}><i />{callSignalingReady ? 'Calls ready' : 'Backend not connected'}</span>
                  <button className="profile-call-button" disabled={!callSignalingReady || !selectedCreator.allowAudioCalls || selectedCreator.availability !== 'ONLINE'} onClick={() => startCelebrityCall(selectedCreator, 'AUDIO')}>
                    <AudioLines size={17} /> Audio call <span>{selectedCreator.audioRateCoinsPerMin} coins/min</span>
                  </button>
                  <button className="profile-call-button profile-video-button" disabled={!callSignalingReady || !selectedCreator.allowVideoCalls || selectedCreator.availability !== 'ONLINE'} onClick={() => startCelebrityCall(selectedCreator, 'VIDEO')}>
                    <Sparkles size={16} /> Video call <span>{selectedCreator.videoRateCoinsPerMin} coins/min</span>
                  </button>
                </div>
              </section>

              <section className="creator-posts-section">
                <div className="creator-posts-heading"><div><p className="eyebrow">CREATOR MOMENTS</p><h2>Recent posts</h2></div><span>{selectedCreator.media.length} moments</span></div>
                <div className="creator-post-grid">
                  {selectedCreator.media.map((post) => (
                    <article className="creator-post-card" key={post.id}>
                      <div className="creator-post-image-wrap"><img src={post.mediaUrl} alt={post.caption} loading="lazy" />{post.mediaType === 'VIDEO' && <span className="post-type-pill">▶ Video</span>}</div>
                      <div className="creator-post-caption"><p>{post.caption}</p><span>♡ {post.likesCount.toLocaleString()}</span></div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : <div className="profile-not-found"><h2>Creator not found</h2><Link href="/#creators">Back to discovery</Link></div>
        )}
        {activeRole === 'NORMAL' && !initialCreatorId && (
          <div id="overview" className="space-y-8">
            {/* Quick connect actions and wallet */}
            {(activeNormalSection === 'overview' || activeNormalSection === 'wallet') && <div className={activeNormalSection === 'wallet' ? 'wallet-only' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
              {activeNormalSection === 'overview' && <section className="quick-connect-panel lg:col-span-2" aria-labelledby="quick-connect-title">
                <div className="quick-connect-heading">
                  <span>QUICK CONNECT</span>
                  <h2 id="quick-connect-title">Choose how to connect</h2>
                  <div className="connect-animated-phrases" aria-hidden="true">
                    <span aria-hidden="true">Say hello to someone new.</span>
                    <span aria-hidden="true">Find a voice worth hearing.</span>
                    <span aria-hidden="true">Make a new connection.</span>
                  </div>
                  <span className="sr-only">Say hello to someone new.</span>
                </div>
                <div className="quick-connect-options">
                  <button
                    onClick={() => startRandomMatchCall('AUDIO')}
                    className="quick-connect-option voice-option"
                  >
                    <span className="quick-connect-icon"><AudioLines size={19} /></span><span><strong>Voice call</strong><small>Talk to someone new</small></span><ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => startRandomMatchCall('VIDEO')}
                    className="quick-connect-option video-option"
                  >
                    <span className="quick-connect-icon"><Video size={19} /></span><span><strong>Video call</strong><small>Meet face to face</small></span><ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => startCustomerCareAudioCall('Normal User')}
                    className="quick-connect-option support-option"
                  >
                    <span className="quick-connect-icon"><Headphones size={19} /></span><span><strong>Support</strong><small>Talk to our team</small></span><ChevronRight size={16} />
                  </button>
                </div>
              </section>}

              {/* Premium Wallet Recharge Card */}
              <div id="wallet" className={`wallet-card p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between ${activeNormalSection === 'wallet' ? 'wallet-page-card' : ''}`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-base">Your wallet</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                      {currentUser.isPremium ? 'PREVIEW VIP' : 'PREVIEW'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 mb-4 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Balance</span>
                    <span className="text-xl font-bold text-amber-400">
                      🪙 {currentUser.coinBalance} Coins
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => notify('Wallet top-ups are not connected. No payment was made and no coins were added.')}
                    className="py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    +300 Coins (₹149)
                  </button>
                  <button
                    onClick={() => notify('Wallet top-ups are not connected. No payment was made and no coins were added.')}
                    className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs"
                  >
                    +1000 Coins (₹399)
                  </button>
                </div>
              </div>
            </div>}

            {activeNormalSection === 'overview' && <div className="overview-divider" aria-hidden="true" />}

            {/* Section 2: Celebrities Feed & Direct Audio/Video Calling */}
            {(activeNormalSection === 'overview' || activeNormalSection === 'creators') && <section id="creators" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Creators to meet</h2>
                </div>
                <span className={`call-server-badge ${callSignalingReady ? 'is-ready' : 'is-offline'}`}><i />{callSignalingReady ? 'Live calling ready' : 'Call service disconnected'}</span>
              </div>

              <div className="creator-grid">
                {celebrities.map((celeb) => (
                  <article key={celeb.userId} className="creator-card">
                    <Link href={`/creator/${celeb.userId}`} className="creator-card-link" aria-label={`View ${celeb.displayName} profile`}>
                      <div className="creator-card-cover">
                        <span className={`creator-presence ${celeb.availability === 'ONLINE' ? 'is-online' : ''}`}><i />{celeb.availability === 'ONLINE' ? 'Available now' : 'Away'}</span>
                        <span className="creator-cover-category">{celeb.category}</span>
                      </div>
                      <div className="creator-card-content">
                        <div className="creator-card-identity">
                          <img src={celeb.avatarUrl} alt={celeb.displayName} className="creator-card-avatar" loading="lazy" />
                          <div className="creator-card-names">
                            <div className="creator-title-line"><h3>{celeb.displayName}</h3>{celeb.isVerified && <BadgeCheck size={17} fill="currentColor" aria-label="Verified creator" />}</div>
                            <span>{celeb.category}</span>
                          </div>
                          <div className="creator-followers"><strong>{((celeb.followersCount + (followedCreatorIds.includes(celeb.userId) ? 1 : 0)) / 1000).toFixed(1)}K</strong><span>followers</span></div>
                        </div>
                      </div>
                    </Link>

                    <div className="creator-card-footer">
                      <button
                        onClick={() => toggleCreatorFollow(celeb.userId)}
                        className={`follow-button ${followedCreatorIds.includes(celeb.userId) ? 'is-following' : ''}`}
                      >
                        {followedCreatorIds.includes(celeb.userId) ? 'Following' : 'Follow'}
                      </button>
                      <Link href={`/creator/${celeb.userId}`} className="creator-view-button">View profile <ChevronRight size={15} /></Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>}

            {activeNormalSection === 'overview' && <div className="overview-divider" aria-hidden="true" />}

            {/* Section 3: Location-Based Events & Ticket Booking */}
            {(activeNormalSection === 'overview' || activeNormalSection === 'events') && <section id="events" className="space-y-4">
              <div className="events-heading flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="events-kicker">MAKE A PLAN</span>
                  <h2 className="text-xl font-bold">Events around you</h2>
                </div>

                {/* Location & Radius Controls */}
                <div className="event-filters flex flex-wrap items-center gap-2">
                  {(['ALL', 'Kochi', 'Kozhikode'] as const).map((city) => (
                    <button
                      key={city}
                      onClick={() => setSelectedCity(city)}
                      className={`event-filter px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                        selectedCity === city
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      📍 {city === 'ALL' ? 'All Nearby Cities' : city}
                    </button>
                  ))}
                  <select
                    value={maxRadiusKm}
                    onChange={(e) => setMaxRadiusKm(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                  >
                    <option value={10}>Within 10 km</option>
                    <option value={50}>Within 50 km</option>
                    <option value={100}>Within 100 km</option>
                  </select>
                </div>
              </div>

                <div className="event-grid">
                {filteredEvents.map((ev) => (
                  <article
                    key={ev.id}
                    className="event-card"
                  >
                    <div className="event-cover">
                      <span className="event-cover-label">UPCOMING EVENT</span>
                      <span className="event-distance"><MapPin size={13} /> {ev.distanceKm} km away</span>
                      <div className="event-date-tile"><strong>{new Date(ev.startTime).toLocaleDateString('en-IN', { day: '2-digit' })}</strong><span>{new Date(ev.startTime).toLocaleDateString('en-IN', { month: 'short' })}</span></div>
                    </div>
                    <div>
                      <div className="event-org-row">
                        <span>{ev.orgName}</span>
                        <span className="event-city-pill">{ev.city}</span>
                      </div>
                      <h3 className="event-title">{ev.title}</h3>
                      <p className="event-description">{ev.description}</p>
                      <div className="event-details">
                        <div><MapPin size={15} /><span>{ev.venueName}</span></div>
                        <div><CalendarDays size={15} /><span>{new Date(ev.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {new Date(ev.startTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span></div>
                      </div>
                    </div>

                    <div className="event-ticket-list">
                      <div className="event-ticket-heading"><span><Ticket size={15} /> Ticket options</span><small>{ev.ticketTiers.length} tiers</small></div>
                      {ev.ticketTiers.map((tier) => (
                        <div key={tier.id} className="event-ticket-tier">
                          <div className="event-ticket-copy">
                            <strong>{tier.name}</strong>
                            <span>{tier.totalCapacity - tier.soldCount} seats left</span>
                          </div>
                          <strong className="event-ticket-price">₹{tier.priceFiat}</strong>
                          <button
                            onClick={() => addEventBooking(ev, tier)}
                            className="event-ticket-button"
                          >
                            Add booking
                          </button>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>

            </section>}

            {activeNormalSection === 'overview' && <div className="overview-divider" aria-hidden="true" />}

            {(activeNormalSection === 'overview' || activeNormalSection === 'passes') && <section id="passes" className="my-bookings-section">
              <div className="bookings-heading"><div><span className="events-kicker">YOUR PLANS</span><h2>My bookings</h2></div><span className="bookings-count">{bookedTickets.length} {bookedTickets.length === 1 ? 'booking' : 'bookings'}</span></div>
              {bookedTickets.length ? <div className="bookings-grid">
                {bookedTickets.map((ticket) => (
                  <article className="booking-card" key={ticket.id}>
                    <div className="booking-icon"><CalendarDays size={20} /></div>
                    <div className="booking-copy"><h3>{ticket.eventTitle}</h3><span>{ticket.tierName} · ₹{ticket.price}</span><small><MapPin size={12} /> {ticket.venueName}, {ticket.city}</small><small><CalendarDays size={12} /> {new Date(ticket.startTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</small></div>
                    <div className="booking-reference"><span>Demo booking</span><strong>{ticket.qrHash}</strong></div>
                  </article>
                ))}
              </div> : <div className="bookings-empty"><div className="bookings-empty-icon"><Ticket size={22} /></div><h3>No bookings yet</h3><p>Choose an event and add a ticket to see it here.</p><button onClick={() => setActiveNormalSection('events')}>Browse events <ChevronRight size={15} /></button></div>}
            </section>}
          </div>
        )}

        {/* =====================================================================
            ROLE 2: CELEBRITY ACCOUNT WORKSPACE
           ===================================================================== */}
        {activeRole === 'CELEBRITY' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Call Rate & Availability Console */}
            <div id="creator-profile" className="creator-studio-profile p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="creator-studio-cover" />
              <div className="creator-studio-identity">
                <img src={currentCreator.avatarUrl} alt={currentCreator.displayName} className="creator-studio-avatar" />
                <div className="creator-studio-name">
                  <div className="creator-title-line"><h2>{currentCreator.displayName}</h2>{currentCreator.isVerified && <BadgeCheck size={17} fill="currentColor" aria-label="Verified creator" />}</div>
                  <span>{currentCreator.category}</span>
                </div>
                <Link href={`/creator/${currentCreator.userId}`} className="creator-public-link">View profile <ChevronRight size={14} /></Link>
              </div>

              <div className="creator-studio-stats">
                <div><strong>{currentCreator.followersCount.toLocaleString()}</strong><span>Followers</span></div>
                <div><strong>{currentCreator.media.length.toLocaleString()}</strong><span>Posts</span></div>
                <div><strong>{currentCreator.audioRateCoinsPerMin}</strong><span>Audio coins / min</span></div>
              </div>

              <div className="creator-earnings-card">
                <div><span className="creator-stat-icon">◉</span><div><span className="creator-earnings-label">Creator earnings</span><strong>{currentUser.earnedCoins.toLocaleString()} <small>coins</small></strong></div></div>
                <span className="creator-earnings-caption">From calls with your community</span>
              </div>

              <div id="creator-rates" className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Preview availability
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ONLINE', 'BUSY', 'OFFLINE'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setCelebrities((prev) =>
                          prev.map((c) => (c.userId === currentCreator.userId ? { ...c, availability: st } : c)),
                        );
                        notify(`Preview status changed to ${st}. No server update was made.`);
                      }}
                      className={`py-2 rounded-lg text-xs font-bold border ${
                        currentCreator.availability === st
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Audio & Video Call Rates (Coins / Min)
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs">🎙️ Audio Call Rate (Coins/min)</span>
                  <input
                    type="number"
                    value={currentCreator.audioRateCoinsPerMin}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCelebrities((prev) =>
                        prev.map((c) => (c.userId === currentCreator.userId ? { ...c, audioRateCoinsPerMin: val } : c)),
                      );
                    }}
                    className="w-24 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-sm text-right"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">📹 Video Call Rate (Coins/min)</span>
                  <input
                    type="number"
                    value={currentCreator.videoRateCoinsPerMin}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCelebrities((prev) =>
                        prev.map((c) => (c.userId === currentCreator.userId ? { ...c, videoRateCoinsPerMin: val } : c)),
                      );
                    }}
                    className="w-24 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-sm text-right"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => startCustomerCareAudioCall('Celebrity VIP')}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold border border-slate-700"
                >
                  🎧 Call VIP Customer Care (Audio-Only)
                </button>
              </div>
            </div>

            {/* Celebrity Photo & Video Upload Studio */}
            <div id="creator-media" className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
              <h3 className="text-lg font-bold">Upload Exclusive Photos & Videos for Fans</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Media Type</label>
                  <select
                    value={newMediaType}
                    onChange={(e) => setNewMediaType(e.target.value as 'PHOTO' | 'VIDEO')}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs"
                  >
                    <option value="PHOTO">📷 Photo Post</option>
                    <option value="VIDEO">▶ Short Video</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Media URL</label>
                  <input
                    type="text"
                    value={newMediaUrl}
                    onChange={(e) => setNewMediaUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Caption</label>
                <input
                  type="text"
                  placeholder="Share an update with your fans..."
                  value={newMediaCaption}
                  onChange={(e) => setNewMediaCaption(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs"
                />
              </div>
              <button
                onClick={async () => {
                  if (!newMediaCaption) {
                    notify('Please enter a caption for your post');
                    return;
                  }
                  try {
                    const response = await fetch(`${BACKEND_URL}/api/celebrities/${currentCreator.userId}/media`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ mediaType: newMediaType, mediaUrl: newMediaUrl, caption: newMediaCaption }),
                    });
                    if (!response.ok) throw new Error('The backend could not save this creator post.');
                    const item = await response.json() as CreatorProfile['media'][number];
                    setCelebrities((prev) => prev.map((creator) => creator.userId === currentCreator.userId
                      ? { ...creator, media: [item, ...creator.media] }
                      : creator));
                    setNewMediaCaption('');
                    notify('Post published to your creator profile.');
                  } catch (error) {
                    notify(error instanceof Error ? error.message : 'Could not publish this post. Check the backend connection.');
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold"
              >
                Publish post
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {currentCreator.media.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800"
                  >
                    <img src={m.mediaUrl} alt={m.caption} className="h-40 w-full object-cover" />
                    <div className="p-3">
                      <span className="text-[10px] font-bold text-blue-400">{m.mediaType}</span>
                      <p className="text-xs text-slate-200 mt-1">{m.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            ROLE 3: ORGANIZATION WORKSPACE (EVENT MANAGEMENT & TICKETING)
           ===================================================================== */}
        {activeRole === 'ORG' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div id="event-create" className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold">Create an event</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Event Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Trivandrum Techno Night 2026"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">City</label>
                    <select
                      value={newEventCity}
                      onChange={(e) => setNewEventCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs"
                    >
                      <option value="Kochi">Kochi</option>
                      <option value="Kozhikode">Kozhikode</option>
                      <option value="Trivandrum">Trivandrum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Ticket Price (₹)</label>
                    <input
                      type="number"
                      value={newEventPrice}
                      onChange={(e) => setNewEventPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Venue Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Greenfield International Stadium"
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!newEventTitle || !newEventVenue) {
                      notify('Please fill in Event Title and Venue');
                      return;
                    }
                    const created: EventItem = {
                      id: `evt-${Date.now()}`,
                      orgId: 'usr-org-1',
                      orgName: 'Kochi Live Arena Events Pvt Ltd',
                      title: newEventTitle,
                      description: 'Official organization event listed on Friends Connect.',
                      venueName: newEventVenue,
                      city: newEventCity,
                      latitude: 8.5241,
                      longitude: 76.9366,
                      distanceKm: 6.5,
                      startTime: new Date(Date.now() + 86400_000 * 5).toISOString(),
                      ticketTiers: [
                        {
                          id: `tier-${Date.now()}`,
                          name: 'Standard Entry Pass',
                          priceFiat: newEventPrice,
                          totalCapacity: 250,
                          soldCount: 0,
                        },
                      ],
                    };
                    setEvents((prev) => [created, ...prev]);
                    setNewEventTitle('');
                    setNewEventVenue('');
                    notify(`Event preview added locally. "${created.title}" was not published.`);
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Preview event
                </button>
              </div>
            </div>

            <div id="published-events" className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="section-heading-row"><h2 className="text-lg font-bold">Event previews</h2><span className="sample-label">Local only · not published</span></div>
              <div className="space-y-3">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <span className="text-[11px] text-blue-400 font-semibold">
                        📍 {ev.city} • {ev.venueName}
                      </span>
                      <h3 className="font-bold text-sm">{ev.title}</h3>
                      <div className="text-xs text-slate-400 mt-1">
                        {ev.ticketTiers.map((t) => (
                          <span key={t.id} className="mr-4">
                            {t.name}: <strong>{t.soldCount}/{t.totalCapacity} sold</strong> (₹{t.priceFiat})
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300 font-semibold">
                      PREVIEW
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            ROLE 4: CUSTOMER CARE SUPPORT DESK (AUDIO CALL + CHAT ONLY)
           ===================================================================== */}
        {activeRole === 'SUPPORT' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div id="support-queue" className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
                Audio + chat
              </span>
              <h2 className="text-lg font-bold">Support inbox</h2>

              <div className="space-y-2.5 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">★ VIP CELEBRITY TICKET</span>
                    <span className="text-[10px] text-slate-400">Dulquer Sithara</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Payout bank settlement verification for October earnings
                  </p>
                  <button
                    onClick={() => startCustomerCareAudioCall('Agent -> Celebrity Dulquer Sithara')}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold"
                  >
                    🎙️ Start Audio Call with Celebrity
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">NORMAL USER TICKET</span>
                    <span className="text-[10px] text-slate-400">Arjun Nair</span>
                  </div>
                  <p className="text-xs text-slate-300">Event QR ticket download query</p>
                  <button
                    onClick={() => startCustomerCareAudioCall('Agent -> User Arjun Nair')}
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                  >
                    🎙️ Start Audio Call with User
                  </button>
                </div>
              </div>
            </div>

            {/* Live Two-Way Support Chat */}
            <div id="support-chat" className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between h-[480px]">
              <div>
                <div className="support-chat-header flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="font-bold text-sm">Omnichannel Customer Care Live Chat</h3>
                  </div>
                  <button
                    onClick={() => startCustomerCareAudioCall('Live Chat Escalation')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold"
                  >
                    🎙️ Audio Call Only
                  </button>
                </div>

                <div className="py-4 space-y-3 overflow-y-auto max-h-[300px]">
                  {supportMessages.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="font-bold text-blue-400">{m.sender}</span>
                        <span>{m.time}</span>
                      </div>
                      <p className="text-slate-200">{m.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="support-message-form flex items-center gap-2 pt-3 border-t border-slate-800">
                <input
                  type="text"
                  placeholder="Type a support message to User or Celebrity..."
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  className="min-w-0 flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs"
                />
                <button
                  onClick={() => {
                    if (!chatDraft.trim()) return;
                    setSupportMessages((prev) => [
                      ...prev,
                      {
                        id: `m-${Date.now()}`,
                        sender: 'Customer Care Desk',
                        role: 'SUPPORT',
                        text: chatDraft,
                        time: 'Just now',
                      },
                    ]);
                    setChatDraft('');
                    notify('Reply added to this local preview only; it was not delivered.');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold"
                >
                  Send Reply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            ROLE 5: SUPER ADMIN COMMAND CENTER (PLATFORM CONTROL & RESTRICTIONS)
           ===================================================================== */}
        {activeRole === 'SUPER_ADMIN' && (
          <div id="admin-users" className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="section-heading-row"><div><p className="eyebrow">DIRECTORY</p><h2 className="text-xl font-bold mb-1">Workspace controls</h2></div><span className="sample-label">Preview data · not saved</span></div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-3 px-3">User / Phone</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Account Status</th>
                      <th className="py-3 px-3">Random Audio</th>
                      <th className="py-3 px-3">Random Video</th>
                      <th className="py-3 px-3">Celebrity Calls</th>
                      <th className="py-3 px-3">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-950/60">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-100">{u.displayName}</div>
                          <div className="text-slate-400">{u.phoneNumber}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-blue-400">{u.role}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold ${
                              u.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={u.restrictions.canRandomAudio}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setUsers((prev) =>
                                prev.map((item) =>
                                  item.id === u.id
                                    ? {
                                        ...item,
                                        restrictions: { ...item.restrictions, canRandomAudio: checked },
                                      }
                                    : item,
                                ),
                              );
                    notify(`Preview permission changed for ${u.displayName}. No server update was made.`);
                            }}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={u.restrictions.canRandomVideo}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setUsers((prev) =>
                                prev.map((item) =>
                                  item.id === u.id
                                    ? {
                                        ...item,
                                        restrictions: { ...item.restrictions, canRandomVideo: checked },
                                      }
                                    : item,
                                ),
                              );
                              notify(`Preview permission changed for ${u.displayName}. No server update was made.`);
                            }}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={u.restrictions.canCallCelebrities}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setUsers((prev) =>
                                prev.map((item) =>
                                  item.id === u.id
                                    ? {
                                        ...item,
                                        restrictions: {
                                          ...item.restrictions,
                                          canCallCelebrities: checked,
                                        },
                                      }
                                    : item,
                                ),
                              );
                              notify(`Preview permission changed for ${u.displayName}. No server update was made.`);
                            }}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => {
                              const nextStatus = u.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
                              setUsers((prev) =>
                                prev.map((item) =>
                                  item.id === u.id ? { ...item, status: nextStatus } : item,
                                ),
                              );
                    notify(`Preview status changed for ${u.displayName}. No server update was made.`);
                            }}
                            className={`px-3 py-1 rounded-lg font-semibold ${
                              u.status === 'ACTIVE'
                                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'Block User' : 'Unblock User'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>}
      </div>

      {/* =====================================================================
          NATIVE HTML <dialog> FOR LIVE AUDIO & VIDEO CALLS
         ===================================================================== */}
      <dialog
        ref={callDialogRef}
        onClose={endActiveCall}
        className="call-dialog"
      >
        {activeCall && (
          <div className="p-5 space-y-5 sm:p-7">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="call-status-chip text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide">
                  ● {activeCall.status === 'ringing' ? (activeCall.callType.startsWith('RANDOM') ? 'MATCHING' : 'RINGING') : rtcConnectionState === 'connected' ? 'CONNECTED' : rtcConnectionState === 'failed' ? 'CONNECTION FAILED' : 'CONNECTING'}
                </span>
                <span className="truncate text-xs font-semibold text-emerald-50">{activeCall.direction === 'creator' ? 'Incoming creator call' : activeCall.direction === 'caller' ? 'Creator call' : 'Friends Connect call'}</span>
              </div>
              <span className="font-mono text-sm font-semibold text-emerald-100">
                {Math.floor(activeCall.elapsedSeconds / 60)
                  .toString()
                  .padStart(2, '0')}
                :
                {(activeCall.elapsedSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>

            {/* Hidden WebRTC Remote Audio Renderer for all calls */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

            {/* WebRTC Video / Audio Stage */}
            <div className="call-stage flex flex-col items-center justify-center overflow-hidden">
              {activeCall.videoEnabled && activeCall.videoPermitted ? (
                <div className="relative flex h-72 w-full flex-col items-center justify-center">
                  {/* Remote Peer WebRTC Video Element */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="call-stage-video"
                  />
                  {rtcConnectionState !== 'connected' && <div className="relative z-10 flex flex-col items-center gap-3 text-center pointer-events-none"><div className="call-avatar">{activeCall.peerName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="font-semibold text-base drop-shadow">{activeCall.peerName}</div><div className="text-xs text-emerald-100/70 drop-shadow">{activeCall.status === 'ringing' ? activeCall.callType.startsWith('RANDOM') ? 'Finding someone to talk to' : 'Ringing · Waiting for answer' : 'Connecting your video call'}</div></div>}
                  {/* Local Self Camera PiP WebRTC Video Element */}
                  <div className="absolute bottom-3 right-3 h-24 w-32 rounded-xl bg-slate-900 border border-teal-300/50 overflow-hidden shadow-lg">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1.5 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-white">
                      You (WebRTC Cam)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="call-avatar mb-4">{activeCall.peerName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
                  <div className="font-semibold text-lg text-white">{activeCall.peerName}</div>
                  <div className="mt-1 text-xs text-emerald-50/65">{activeCall.status === 'ringing' ? activeCall.callType.startsWith('RANDOM') ? 'Finding someone to talk to' : 'Calling creator · Waiting for them to answer' : activeCall.peerSubtitle}</div>
                  <div className="mt-3 text-[11px] font-medium text-teal-200">
                    {rtcConnectionState === 'connected' ? 'You are connected' : activeCall.status === 'ringing' ? 'Your microphone stays off until they answer' : 'Joining the call…'}
                  </div>
                </div>
              )}
            </div>

            {/* Metering Info for Celebrity Calls */}
            {activeCall.rateCoinsPerMin > 0 && activeCall.direction === 'caller' && activeCall.status !== 'ringing' && (
              <div className="call-meter p-3 flex items-center justify-between gap-3 text-xs">
                <span>
                  Call rate: <strong>{activeCall.rateCoinsPerMin} coins/min</strong>
                </span>
                <span className="font-bold">
                  {activeCall.coinsCharged} coins used · {currentUser.coinBalance} left
                </span>
              </div>
            )}

            {/* WebRTC Call Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                onClick={() => {
                  const nextMuted = !activeCall.muted;
                  webrtcClientRef.current?.toggleAudioMute(nextMuted);
                  setActiveCall((prev) => (prev ? { ...prev, muted: nextMuted } : null));
                }}
                disabled={activeCall.status !== 'active'}
                className={`call-control ${
                  activeCall.muted
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                {activeCall.muted ? '🔇 Unmute Mic' : '🎙️ Mute Mic'}
              </button>

              {activeCall.videoPermitted ? (
                <button
                  onClick={() => {
                    const nextVideo = !activeCall.videoEnabled;
                    webrtcClientRef.current?.toggleVideoTrack(nextVideo);
                    setActiveCall((prev) =>
                      prev ? { ...prev, videoEnabled: nextVideo } : null,
                    );
                  }}
                  disabled={activeCall.status !== 'active'}
                  className="call-control"
                >
                  {activeCall.videoEnabled ? '📷 Turn Camera Off' : '📹 Switch Camera On'}
                </button>
              ) : (
                <span className="text-[11px] text-slate-500 px-2">
                  🔒 WebRTC Video Disabled on Support Calls
                </span>
              )}

              {activeCall.status !== 'ringing' && <button
                onClick={() => {
                  notify('Report and block will be available when moderation is connected.');
                }}
                className="call-control"
              >
                🚩 Report & Block
              </button>}

              <button
                onClick={endActiveCall}
                className="call-control call-control-end"
              >
                {activeCall.status === 'ringing' ? 'Cancel call' : 'End call'}
              </button>
            </div>
          </div>
        )}
      </dialog>

      <dialog ref={incomingCallDialogRef} className="incoming-call-dialog">
        {incomingCall && (
          <div className="incoming-call-card">
            <div className="incoming-call-icon"><AudioLines size={30} /></div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-teal-200">Incoming creator call</p>
            <h2 className="text-2xl font-semibold tracking-tight text-white">{incomingCall.callerName}</h2>
            <p className="mt-2 text-sm text-emerald-50/65">{incomingCall.mode === 'VIDEO' ? 'Video call' : 'Audio call'} · {incomingCall.rateCoinsPerMin} coins/min</p>
            <div className="incoming-call-actions">
              <button className="reject-call" onClick={() => respondToIncomingCall(false)}>Decline</button>
              <button className="accept-call" onClick={() => respondToIncomingCall(true)}>Answer call</button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
