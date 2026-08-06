import { formatDuration } from '../musicUtils';

describe('formatDuration', () => {
  it('formats whole minutes and seconds', () => {
    expect(formatDuration(234000)).toBe('3:54');
    expect(formatDuration(60000)).toBe('1:00');
  });

  it('zero-pads seconds', () => {
    expect(formatDuration(65000)).toBe('1:05');
  });

  it('handles durations over an hour as total minutes', () => {
    expect(formatDuration(3_723_000)).toBe('62:03');
  });

  it('truncates sub-second remainders rather than rounding up', () => {
    expect(formatDuration(59_999)).toBe('0:59');
  });

  it('renders missing or zero durations as 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(NaN)).toBe('0:00');
    expect(formatDuration(undefined as unknown as number)).toBe('0:00');
  });
});
