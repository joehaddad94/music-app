import { MusicTrack } from '../types/MusicTypes';
import { nativeIdOf } from '../utils/trackId';
import { JamendoClient } from './JamendoClient';
import { toDurableTrack } from './MusicSources';

/**
 * Recommendation lookup for smart shuffle.
 *
 * Sits between `MusicService` and the catalogue so the playback service does
 * not depend on a specific provider, and so tests can replace it wholesale.
 */

/** How many suggestions to request per refill. */
const BATCH_SIZE = 24;

export const smartShuffle = {
  async recommendationsFor(seed: MusicTrack): Promise<MusicTrack[]> {
    if (seed.source !== 'jamendo') return [];

    const tracks = await JamendoClient.similarTracks(nativeIdOf(seed.id), {
      limit: BATCH_SIZE,
    });

    // Queued tracks outlive the signed stream URL a search response carries,
    // so store the durable form from the start.
    return tracks.map(toDurableTrack);
  },
};

/**
 * Weaves `additions` into `queue` after `currentIndex`, keeping roughly two
 * known tracks per suggestion.
 *
 * The ratio is the whole point: an unbroken run of unfamiliar tracks stops
 * feeling like your queue with discoveries in it and starts feeling like a
 * radio station you did not ask for. Everything before and including
 * `currentIndex` is untouched, so what is playing and what has played stay put.
 */
export const interleave = (
  queue: MusicTrack[],
  additions: MusicTrack[],
  currentIndex: number,
  knownPerAddition = 2
): MusicTrack[] => {
  if (additions.length === 0) return queue;

  // `currentIndex` is -1 when nothing is playing, and that has to mean "no
  // head" rather than "the first track is playing" — otherwise the first
  // track gets pinned in place for no reason.
  const splitAt = Math.max(0, currentIndex + 1);
  const head = queue.slice(0, splitAt);
  const tail = queue.slice(splitAt);

  const woven: MusicTrack[] = [];
  let remaining = [...additions];

  while (tail.length > 0 || remaining.length > 0) {
    for (let i = 0; i < knownPerAddition && tail.length > 0; i++) {
      woven.push(tail.shift() as MusicTrack);
    }
    if (remaining.length > 0) {
      woven.push(remaining.shift() as MusicTrack);
    }
    // Nothing known left to pace with: append the rest and stop.
    if (tail.length === 0) {
      woven.push(...remaining);
      break;
    }
  }

  return [...head, ...woven];
};
