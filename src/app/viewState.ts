import type { User } from 'firebase/auth';

import type { UserProfile } from '@/domain/types';

export type AppViewState = 'loading' | 'signin' | 'nickname' | 'app';

export const resolveAppViewState = ({
  authLoading,
  profileLoading,
  currentUser,
  userProfile,
}: {
  authLoading: boolean;
  profileLoading: boolean;
  currentUser: User | null;
  userProfile: UserProfile | null;
}): AppViewState => {
  if (authLoading || profileLoading) return 'loading';
  if (!currentUser) return 'signin';
  if (!userProfile) return 'loading';
  if (!userProfile.nickname?.trim() || !userProfile.customTitle?.trim()) return 'nickname';
  return 'app';
};
