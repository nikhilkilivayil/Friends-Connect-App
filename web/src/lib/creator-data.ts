export interface CreatorProfile {
  userId: string;
  displayName: string;
  category: string;
  bio: string;
  avatarUrl: string;
  isVerified: boolean;
  availability: 'ONLINE' | 'BUSY' | 'OFFLINE';
  allowAudioCalls: boolean;
  allowVideoCalls: boolean;
  audioRateCoinsPerMin: number;
  videoRateCoinsPerMin: number;
  followersCount: number;
  media: Array<{
    id: string;
    mediaType: 'PHOTO' | 'VIDEO';
    mediaUrl: string;
    caption: string;
    likesCount: number;
  }>;
}

export const creatorProfiles: CreatorProfile[] = [
  {
    userId: 'usr-celeb-1',
    displayName: 'Dulquer Sithara',
    category: 'Cinema & Acting',
    bio: 'Connecting directly with fans through one-to-one audio and video calls. Sharing a few moments from the set and studio.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=640&h=640&fit=crop&crop=faces',
    isVerified: true,
    availability: 'ONLINE',
    allowAudioCalls: true,
    allowVideoCalls: true,
    audioRateCoinsPerMin: 60,
    videoRateCoinsPerMin: 150,
    followersCount: 128400,
    media: [
      {
        id: 'med-1',
        mediaType: 'PHOTO',
        mediaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=900&auto=format&fit=crop',
        caption: 'Evening shoot wrap at Fort Kochi waterfront.',
        likesCount: 4320,
      },
      {
        id: 'med-2',
        mediaType: 'VIDEO',
        mediaUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&auto=format&fit=crop',
        caption: 'A first look at tonight’s fan session.',
        likesCount: 8910,
      },
    ],
  },
  {
    userId: 'usr-celeb-2',
    displayName: 'Ananya Menon',
    category: 'Playback Singer & Indie Pop',
    bio: 'Singer, songwriter, and late-night studio person. Drop in for an acoustic request or a little chat.',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=640&h=640&fit=crop&crop=faces',
    isVerified: true,
    availability: 'ONLINE',
    allowAudioCalls: true,
    allowVideoCalls: true,
    audioRateCoinsPerMin: 40,
    videoRateCoinsPerMin: 100,
    followersCount: 84500,
    media: [
      {
        id: 'med-3',
        mediaType: 'PHOTO',
        mediaUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop',
        caption: 'Studio rehearsal session in Trivandrum.',
        likesCount: 2150,
      },
      {
        id: 'med-4',
        mediaType: 'PHOTO',
        mediaUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=900&auto=format&fit=crop',
        caption: 'A little backstage moment before the show.',
        likesCount: 1790,
      },
    ],
  },
];

const FOLLOWING_KEY = 'friends-connect:following-creators';

export function readFollowedCreatorIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(FOLLOWING_KEY) || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleFollowedCreator(creatorId: string): string[] {
  const current = readFollowedCreatorIds();
  const next = current.includes(creatorId)
    ? current.filter((id) => id !== creatorId)
    : [...current, creatorId];
  window.localStorage.setItem(FOLLOWING_KEY, JSON.stringify(next));
  return next;
}
