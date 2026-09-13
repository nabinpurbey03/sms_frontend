import { create } from 'zustand';

interface ViewAsState {
  activeToken: string | null;
  expiresAt: Date | null;
  targetUserId: string | null;
  startSession: (token: string, userId: string) => void;
  endSession: () => void;
}

export const useViewAsStore = create<ViewAsState>((set) => ({
  activeToken: null,
  expiresAt: null,
  targetUserId: null,
  startSession: (token: string, userId: string) => {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    set({ activeToken: token, targetUserId: userId, expiresAt });
  },
  endSession: () => set({ activeToken: null, targetUserId: null, expiresAt: null }),
}));
