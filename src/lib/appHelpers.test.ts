import { describe, expect, it } from 'vitest';

import { isSuperAdminEmail, resolveProfilePhotoUrl, resolveProfileTitle, sanitizeFirestoreValue } from './appHelpers';

describe('resolveProfilePhotoUrl', () => {
  it('recognizes both current and transitional super admins', () => {
    expect(isSuperAdminEmail('info.nakoleo@gmail.com')).toBe(true);
    expect(isSuperAdminEmail('creative.y8pv@gmail.com')).toBe(true);
    expect(isSuperAdminEmail('user@example.com')).toBe(false);
  });

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

  it('strips undefined values from nested Firestore payloads', () => {
    expect(
      sanitizeFirestoreValue({
        taskName: 'Poster',
        channel: undefined,
        attachments: [
          { fileId: '1', mimeType: undefined, link: 'https://example.com' },
        ],
      }),
    ).toEqual({
      taskName: 'Poster',
      attachments: [
        { fileId: '1', link: 'https://example.com' },
      ],
    });
  });
});
