// Go backend API client for the social features
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}

// ---- Types ----
export interface UserProfile {
  id: string;
  clerkId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  website?: string;
  isVerified: boolean;
  isPrivate: boolean;
  followerCount: number;
  followingCount: number;
  reelCount: number;
  createdAt: string;
}

export interface ProfileResponse extends UserProfile {
  isFollowing: boolean;
  isFollowedBy: boolean;
}

export interface ReelFeedItem {
  id: string;
  creatorId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption: string;
  durationMs: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  hashtags: string[];
  status: string;
  createdAt: string;
  creator: UserProfile;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
}

export interface FeedResponse {
  reels: ReelFeedItem[];
  nextCursor: string;
  hasMore: boolean;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  actorId?: string;
  type: "like" | "comment" | "follow" | "mention" | "reel_share";
  entityType?: string;
  entityId?: string;
  message?: string;
  isRead: boolean;
  createdAt: string;
  actor?: UserProfile;
}

// ---- Profile API ----
export const profileApi = {
  getMyProfile: (token: string) =>
    apiRequest<UserProfile>("/api/v1/profile", {}, token),

  updateMyProfile: (token: string, data: Partial<UserProfile>) =>
    apiRequest<UserProfile>(
      "/api/v1/profile",
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      token,
    ),

  getUserProfile: (username: string, token?: string) =>
    apiRequest<ProfileResponse>(`/api/v1/users/${username}/profile`, {}, token),

  searchUsers: (query: string, token: string) =>
    apiRequest<UserProfile[]>(
      `/api/v1/users/search?q=${encodeURIComponent(query)}`,
      {},
      token,
    ),

  syncProfile: (data: {
    clerkId: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
  }) =>
    apiRequest<UserProfile>("/api/v1/profile/sync", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ---- Social API ----
export const socialApi = {
  follow: (userId: string, token: string) =>
    apiRequest<{ following: boolean }>(
      `/api/v1/users/${userId}/follow`,
      { method: "POST" },
      token,
    ),

  unfollow: (userId: string, token: string) =>
    apiRequest<{ following: boolean }>(
      `/api/v1/users/${userId}/follow`,
      { method: "DELETE" },
      token,
    ),

  getFollowers: (userId: string, token: string) =>
    apiRequest<UserProfile[]>(`/api/v1/users/${userId}/followers`, {}, token),

  getFollowing: (userId: string, token: string) =>
    apiRequest<UserProfile[]>(`/api/v1/users/${userId}/following`, {}, token),
};

// ---- Reels API ----
export const reelsApi = {
  getFeed: (token: string, cursor?: string) =>
    apiRequest<FeedResponse>(
      `/api/v1/feed${cursor ? `?cursor=${cursor}` : ""}`,
      {},
      token,
    ),

  getTrending: (token?: string) =>
    apiRequest<ReelFeedItem[]>("/api/v1/feed/trending", {}, token),

  getReel: (id: string, token?: string) =>
    apiRequest<ReelFeedItem>(`/api/v1/reels/${id}`, {}, token),

  like: (id: string, token: string) =>
    apiRequest<{ liked: boolean }>(
      `/api/v1/reels/${id}/like`,
      { method: "POST" },
      token,
    ),

  unlike: (id: string, token: string) =>
    apiRequest<{ liked: boolean }>(
      `/api/v1/reels/${id}/like`,
      { method: "DELETE" },
      token,
    ),

  save: (id: string, token: string) =>
    apiRequest<{ saved: boolean }>(
      `/api/v1/reels/${id}/save`,
      { method: "POST" },
      token,
    ),

  unsave: (id: string, token: string) =>
    apiRequest<{ saved: boolean }>(
      `/api/v1/reels/${id}/save`,
      { method: "DELETE" },
      token,
    ),

  addComment: (id: string, content: string, token: string) =>
    apiRequest<{ commentId: string }>(
      `/api/v1/reels/${id}/comments`,
      { method: "POST", body: JSON.stringify({ content }) },
      token,
    ),

  recordView: (
    id: string,
    watchDuration: number,
    completed: boolean,
    token: string,
  ) =>
    apiRequest<{ status: string }>(
      `/api/v1/reels/${id}/view`,
      { method: "POST", body: JSON.stringify({ watchDuration, completed }) },
      token,
    ),
};

// ---- Notifications API ----
export const notificationsApi = {
  getNotifications: (token: string, limit = 20, offset = 0) =>
    apiRequest<NotificationItem[]>(
      `/api/v1/notifications?limit=${limit}&offset=${offset}`,
      {},
      token,
    ),

  markAsRead: (token: string, ids?: string[]) =>
    apiRequest<{ status: string }>(
      "/api/v1/notifications/read",
      { method: "POST", body: JSON.stringify({ ids }) },
      token,
    ),

  getUnreadCount: (token: string) =>
    apiRequest<{ count: number }>(
      "/api/v1/notifications/unread-count",
      {},
      token,
    ),
};
