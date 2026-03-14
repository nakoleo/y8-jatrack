import { describe, expect, it } from 'vitest';

import { resolveProfilePhotoUrl, resolveProfileTitle } from './appHelpers';

describe('resolveProfilePhotoUrl', () => {
  it('prefers manual profile overrides for Gift', () => {
    expect(
      resolveProfilePhotoUrl({
        email: 'host.y8@gmail.com',
        googlePhotoURL: 'https://example.com/google.jpg',
        storedPhotoURL: 'https://example.com/stored.jpg',
      }),
    ).toBe('/avatars/gift-display.jpg');
  });

  it('falls back to google photo for normal users', () => {
    expect(
      resolveProfilePhotoUrl({
        email: 'user@example.com',
        googlePhotoURL: 'https://example.com/google.jpg',
        storedPhotoURL: 'https://example.com/stored.jpg',
      }),
    ).toBe('https://example.com/google.jpg');
  });

  it('upgrades Gift title to Sr.Graphic Designer when still using the default label', () => {
    expect(
      resolveProfileTitle({
        email: 'host.y8@gmail.com',
        role: 'graphic_designer',
        customTitle: 'Graphic Designer',
      }),
    ).toBe('Sr.Graphic Designer');
  });
});
