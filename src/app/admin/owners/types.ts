export type QueueOwnerMembership = {
  id: string;
  resortName: string | null;
  useYear: string | null;
  pointsOwned: number | null;
  pointsAvailable: number | null;
};

export type QueueOwnerDocument = {
  id: string;
  kind: string;
  storagePath: string;
  createdAt: string;
  previewUrl?: string | null;
};

export type QueueOwnerRecord = {
  id: string;
  status: string;
  submittedAt: string | null;
  displayName: string | null;
  email: string | null;
  memberships: QueueOwnerMembership[];
  documents: QueueOwnerDocument[];
  activity: QueueOwnerActivity[];
};

export type QueueOwnerActivity = {
  id: string;
  type: 'comment' | 'event';
  createdAt: string;
  authorId: string | null;
  authorName?: string | null;
  body?: string | null;
  statusTransition?: {
    from: string | null;
    to: string;
  };
};
