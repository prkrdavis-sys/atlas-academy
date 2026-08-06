import type { GameMode, GameScope, Region } from "@/lib/types";

/** Public directory row: mirrors whichever profile the account has active. */
export type PlayerRow = {
  id: string;
  email: string;
  friend_code: string;
  display_name: string;
  avatar_id: string | null;
  avatar_color: string;
};

export type FriendshipStatus = "pending" | "accepted" | "ignored";

export type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
};

export type MatchStatus = "invited" | "active" | "complete" | "declined" | "abandoned";

/** Everything both clients need to build an identical GameEngine. */
export type MatchSettings = {
  mode: GameMode;
  continents: Region[];
  includeTerritories: boolean;
  scope: GameScope;
};

export type MatchRow = {
  id: string;
  host_id: string;
  guest_id: string;
  status: MatchStatus;
  settings: MatchSettings;
  seed: number;
  question_count: number;
  host_score: number;
  guest_score: number;
  winner_id: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};

export type MatchAnswerRow = {
  player_id: string;
  answer: string | null;
  is_correct: boolean;
  timed_out: boolean;
  answered_at: string;
};

/** Snapshot returned by every answer-writing RPC. */
export type MatchQuestionState = {
  server_time: string;
  answers: MatchAnswerRow[];
};

export type HeadToHeadRecord = {
  opponent_id: string;
  wins: number;
  losses: number;
  draws: number;
  played: number;
};

export type PresenceActivity = "idle" | "in-round" | "in-match";

export type PresenceEntry = {
  userId: string;
  displayName: string;
  avatarId: string | null;
  avatarColor: string;
  activity: PresenceActivity;
};

/** A friend plus everything the friends list renders for them. */
export type Friend = {
  friendshipId: string;
  player: PlayerRow;
  presence: PresenceEntry | null;
  record: HeadToHeadRecord | null;
};

export type FriendRequest = {
  friendshipId: string;
  player: PlayerRow;
  createdAt: string;
};

export type MatchInvite = {
  match: MatchRow;
  player: PlayerRow;
};
