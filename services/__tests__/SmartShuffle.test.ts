import { MusicTrack } from '../../types/MusicTypes';
import { interleave } from '../SmartShuffle';

const track = (id: string): MusicTrack => ({
  id,
  source: 'jamendo',
  title: id,
  artist: 'Someone',
  duration: 1000,
  uri: `https://example.test/${id}`,
});

const ids = (tracks: MusicTrack[]) => tracks.map(t => t.id);

describe('interleave', () => {
  it('leaves everything up to and including the current track untouched', () => {
    const queue = ['a', 'b', 'c', 'd'].map(track);
    const result = interleave(queue, [track('x')], 1);

    // Played and playing must not move under the user's feet.
    expect(ids(result).slice(0, 2)).toEqual(['a', 'b']);
  });

  it('paces discoveries two known tracks apart', () => {
    const queue = ['a', 'b', 'c', 'd', 'e'].map(track);
    const result = interleave(queue, [track('x'), track('y')], -1);

    expect(ids(result)).toEqual(['a', 'b', 'x', 'c', 'd', 'y', 'e']);
  });

  it('respects a different ratio', () => {
    const queue = ['a', 'b', 'c', 'd'].map(track);
    const result = interleave(queue, [track('x')], -1, 1);

    expect(ids(result)).toEqual(['a', 'x', 'b', 'c', 'd']);
  });

  it('appends the remainder once there is nothing left to pace with', () => {
    const queue = ['a', 'b'].map(track);
    const result = interleave(queue, ['x', 'y', 'z'].map(track), -1);

    expect(ids(result)).toEqual(['a', 'b', 'x', 'y', 'z']);
  });

  it('keeps every track exactly once', () => {
    const queue = ['a', 'b', 'c', 'd', 'e', 'f'].map(track);
    const additions = ['x', 'y'].map(track);

    const result = interleave(queue, additions, 2);

    expect(result).toHaveLength(8);
    expect(new Set(ids(result)).size).toBe(8);
  });

  it('is a no-op when there is nothing to add', () => {
    const queue = ['a', 'b'].map(track);

    expect(interleave(queue, [], 0)).toBe(queue);
  });

  it('handles a queue whose current track is the last one', () => {
    const queue = ['a', 'b'].map(track);
    const result = interleave(queue, [track('x')], 1);

    expect(ids(result)).toEqual(['a', 'b', 'x']);
  });
});
