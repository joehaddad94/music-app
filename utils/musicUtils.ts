export const formatDuration = (milliseconds: number): string => {
  if (milliseconds === 0 || !milliseconds) {
    return '0:00';
  }
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
