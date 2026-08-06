import {
  isNamespacedId,
  makeTrackId,
  namespaceLegacyId,
  nativeIdOf,
  sourceOfId,
} from '../trackId';

describe('track ids', () => {
  it('namespaces ids by source', () => {
    expect(makeTrackId('local', 'abc')).toBe('local:abc');
    expect(makeTrackId('jamendo', 1234)).toBe('jamendo:1234');
  });

  it('keeps a local asset id distinct from a jamendo track id with the same value', () => {
    // The whole point of namespacing: favorites and playlists persist ids
    // alone, so a collision here would favourite the wrong song.
    expect(makeTrackId('local', '1234')).not.toBe(makeTrackId('jamendo', '1234'));
  });

  it('recognises which source an id belongs to', () => {
    expect(sourceOfId('jamendo:99')).toBe('jamendo');
    expect(sourceOfId('local:99')).toBe('local');
    expect(sourceOfId('99')).toBeNull();
    expect(isNamespacedId('spotify:99')).toBe(false);
  });

  it('recovers the id the source platform knows', () => {
    expect(nativeIdOf('jamendo:1234')).toBe('1234');
    expect(nativeIdOf('bare-id')).toBe('bare-id');
  });

  it('treats a colon inside the native id as part of the id', () => {
    const id = makeTrackId('local', 'content://media/external/audio:42');
    expect(nativeIdOf(id)).toBe('content://media/external/audio:42');
  });

  describe('legacy ids', () => {
    it('upgrades a bare id to local, since nothing else could have written it', () => {
      expect(namespaceLegacyId('1234')).toBe('local:1234');
    });

    it('leaves an already-namespaced id alone, so migrating twice is safe', () => {
      expect(namespaceLegacyId('jamendo:1234')).toBe('jamendo:1234');
      expect(namespaceLegacyId(namespaceLegacyId('1234'))).toBe('local:1234');
    });
  });
});
