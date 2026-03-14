import { describe, expect, it } from 'vitest';

import { resolveAppViewState } from './viewState';

describe('resolveAppViewState', () => {
  it('returns signin when unauthenticated', () => {
    expect(resolveAppViewState({
      authLoading: false,
      profileLoading: false,
      currentUser: null,
      userProfile: null,
    })).toBe('signin');
  });

  it('returns loading when profile still loading', () => {
    expect(resolveAppViewState({
      authLoading: false,
      profileLoading: true,
      currentUser: { uid: 'u1' } as never,
      userProfile: null,
    })).toBe('loading');
  });

  it('returns nickname when authenticated profile has no nickname', () => {
    expect(resolveAppViewState({
      authLoading: false,
      profileLoading: false,
      currentUser: { uid: 'u1' } as never,
      userProfile: {
        uid: 'u1',
        displayName: 'User',
        nickname: '',
        email: 'user@example.com',
        role: 'custom',
        isAdmin: false,
        createdAt: 1,
        updatedAt: 1,
      },
    })).toBe('nickname');
  });

  it('returns nickname when authenticated profile has no custom title', () => {
    expect(resolveAppViewState({
      authLoading: false,
      profileLoading: false,
      currentUser: { uid: 'u1' } as never,
      userProfile: {
        uid: 'u1',
        displayName: 'User',
        nickname: 'Gift',
        email: 'user@example.com',
        role: 'custom',
        isAdmin: false,
        createdAt: 1,
        updatedAt: 1,
      },
    })).toBe('nickname');
  });

  it('returns app for ready authenticated user', () => {
    expect(resolveAppViewState({
      authLoading: false,
      profileLoading: false,
      currentUser: { uid: 'u1' } as never,
      userProfile: {
        uid: 'u1',
        displayName: 'User',
        nickname: 'Gift',
        email: 'user@example.com',
        role: 'custom',
        isAdmin: false,
        customTitle: 'Designer',
        createdAt: 1,
        updatedAt: 1,
      },
    })).toBe('app');
  });
});
