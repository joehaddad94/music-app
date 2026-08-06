import { MusicTrack } from '../../types/MusicTypes';
import { toDurableTrack } from '../MusicSources';

const jamendoTrack = (overrides: Partial<MusicTrack> = {}): MusicTrack => ({
  id: 'jamendo:1593988',
  source: 'jamendo',
  title: 'Lofi Chillout Hip Hop Beat',
  artist: 'Joystock',
  duration: 149000,
  // Shape of a real search response: signed, with a token that is regenerated
  // on every request.
  uri: 'https://prod-1.storage.jamendo.com/?trackid=1593988&format=mp32&from=scYmnnjuha6E%3D%3D',
  ...overrides,
});

beforeEach(() => {
  process.env.EXPO_PUBLIC_JAMENDO_CLIENT_ID = 'test-client-id';
});

describe('toDurableTrack', () => {
  it('replaces a signed stream url with a permanently resolvable one', () => {
    const durable = toDurableTrack(jamendoTrack());

    expect(durable.uri).not.toContain('from=');
    expect(durable.uri).toContain('/tracks/file/');
    expect(durable.uri).toContain('id=1593988');
  });

  it('keeps everything else about the track intact', () => {
    const track = jamendoTrack();
    const durable = toDurableTrack(track);

    expect(durable).toMatchObject({
      id: track.id,
      source: 'jamendo',
      title: track.title,
      artist: track.artist,
      duration: track.duration,
    });
  });

  it('leaves local tracks alone — a file path does not expire', () => {
    const local: MusicTrack = {
      id: 'local:a1',
      source: 'local',
      title: 'Song One',
      artist: 'Unknown Artist',
      duration: 210000,
      uri: 'file:///music/a1.mp3',
    };

    expect(toDurableTrack(local)).toBe(local);
  });

  it('keeps the original url rather than losing the track when unconfigured', () => {
    delete process.env.EXPO_PUBLIC_JAMENDO_CLIENT_ID;
    const track = jamendoTrack();

    expect(toDurableTrack(track).uri).toBe(track.uri);
  });
});
