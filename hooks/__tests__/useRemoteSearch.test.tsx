import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useRemoteSearch } from '../useRemoteSearch';
import { RemoteMusicSource } from '../../services/MusicSources';
import { MusicTrack } from '../../types/MusicTypes';

/**
 * Covers the parts of the Discover data flow that only exist in time:
 * debouncing, cancellation of superseded requests, and paging. These are the
 * behaviours that protect the monthly request quota, so they are worth
 * testing even though it costs a React renderer.
 */

const track = (id: string): MusicTrack => ({
  id: `jamendo:${id}`,
  source: 'jamendo',
  title: `Track ${id}`,
  artist: 'Someone',
  duration: 1000,
  uri: `https://example.test/${id}`,
});

const makeSource = (overrides: Partial<RemoteMusicSource> = {}): RemoteMusicSource => ({
  id: 'jamendo',
  label: 'Jamendo',
  credit: 'Music provided by Jamendo',
  isConfigured: () => true,
  browse: jest.fn(async () => ({ tracks: [track('b1')], hasMore: false })),
  search: jest.fn(async () => ({ tracks: [track('s1')], hasMore: false })),
  tagged: jest.fn(async () => ({ tracks: [track('t1')], hasMore: false })),
  ...overrides,
});

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useRemoteSearch', () => {
  it('browses the default listing before anything is typed', async () => {
    const source = makeSource();
    const { result } = renderHook(() => useRemoteSearch(source));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(source.browse).toHaveBeenCalled();
    expect(result.current.tracks.map(t => t.id)).toEqual(['jamendo:b1']);
  });

  it('does not search on every keystroke', async () => {
    const source = makeSource();
    const { result } = renderHook(() => useRemoteSearch(source));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setQuery('l'));
    act(() => result.current.setQuery('lo'));
    act(() => result.current.setQuery('lof'));
    act(() => result.current.setQuery('lofi'));

    // Advance by less than the debounce interval. Asserting without moving the
    // clock at all would pass even with no debounce, since a 0ms timer is still
    // pending until timers run — that would test the cleanup, not the delay.
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(source.search).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(source.search).toHaveBeenCalledTimes(1));
    expect(source.search).toHaveBeenCalledWith('lofi', 0, expect.anything());
  });

  it('clearing the query goes back to browsing without waiting', async () => {
    const source = makeSource();
    const { result } = renderHook(() => useRemoteSearch(source));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setQuery('lofi'));
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(source.search).toHaveBeenCalled());

    act(() => result.current.setQuery(''));

    await waitFor(() => expect(result.current.tracks.map(t => t.id)).toEqual(['jamendo:b1']));
  });

  it('a tag tap does not wait for the debounce', async () => {
    const source = makeSource();
    const { result } = renderHook(() => useRemoteSearch(source));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.selectTag('jazz'));

    await waitFor(() => expect(source.tagged).toHaveBeenCalledWith('jazz', 0, expect.anything()));
  });

  it('tapping the selected tag again clears it', async () => {
    const source = makeSource();
    const { result } = renderHook(() => useRemoteSearch(source));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.selectTag('jazz'));
    await waitFor(() => expect(result.current.tag).toBe('jazz'));

    act(() => result.current.selectTag('jazz'));
    await waitFor(() => expect(result.current.tag).toBeNull());
  });

  it('appends the next page and drops duplicates', async () => {
    const source = makeSource({
      browse: jest
        .fn()
        .mockResolvedValueOnce({ tracks: [track('1'), track('2')], hasMore: true })
        // Offset paging can repeat a track when the ordering shifts underneath.
        .mockResolvedValueOnce({ tracks: [track('2'), track('3')], hasMore: false }),
    });
    const { result } = renderHook(() => useRemoteSearch(source));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.loadMore());

    await waitFor(() =>
      expect(result.current.tracks.map(t => t.id)).toEqual([
        'jamendo:1',
        'jamendo:2',
        'jamendo:3',
      ])
    );
  });

  it('does not page past the end', async () => {
    const source = makeSource();
    const { result } = renderHook(() => useRemoteSearch(source));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.loadMore());

    // hasMore was false, so the second request must never happen.
    expect(source.browse).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failure and recovers on retry', async () => {
    const source = makeSource({
      browse: jest
        .fn()
        .mockRejectedValueOnce(new Error('Could not reach Jamendo.'))
        .mockResolvedValueOnce({ tracks: [track('ok')], hasMore: false }),
    });
    const { result } = renderHook(() => useRemoteSearch(source));

    await waitFor(() => expect(result.current.error).toBe('Could not reach Jamendo.'));

    act(() => result.current.retry());

    // `error` is cleared when the retry starts, not when it lands, so waiting
    // on the results is what actually proves the retry succeeded.
    await waitFor(() => expect(result.current.tracks.map(t => t.id)).toEqual(['jamendo:ok']));
    expect(result.current.error).toBeNull();
  });

  it('reports a missing configuration instead of calling the network', async () => {
    const source = makeSource({ isConfigured: () => false });
    const { result } = renderHook(() => useRemoteSearch(source));

    await waitFor(() => expect(result.current.error).toMatch(/EXPO_PUBLIC_JAMENDO_CLIENT_ID/));
    expect(source.browse).not.toHaveBeenCalled();
  });

  it('a superseded request cannot overwrite newer results', async () => {
    let resolveSlow: (value: { tracks: MusicTrack[]; hasMore: boolean }) => void = () => {};
    const source = makeSource({
      browse: jest.fn(
        () =>
          new Promise(resolve => {
            resolveSlow = resolve;
          })
      ),
      tagged: jest.fn(async () => ({ tracks: [track('fast')], hasMore: false })),
    });

    const { result } = renderHook(() => useRemoteSearch(source));

    // The browse is still in flight when the user picks a tag.
    act(() => result.current.selectTag('jazz'));
    await waitFor(() => expect(result.current.tracks.map(t => t.id)).toEqual(['jamendo:fast']));

    // The stale response lands late and must be ignored.
    await act(async () => {
      resolveSlow({ tracks: [track('stale')], hasMore: false });
    });

    expect(result.current.tracks.map(t => t.id)).toEqual(['jamendo:fast']);
  });
});
