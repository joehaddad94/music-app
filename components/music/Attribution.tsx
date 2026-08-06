import React, { memo, useCallback } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { MusicTrack } from '../../types/MusicTypes';
import { ThemedText } from '../ThemedText';

/**
 * Attribution for streamed tracks.
 *
 * This is a contractual requirement, not decoration. Jamendo's API terms
 * require an application to credit the artist as creator, credit Jamendo as
 * the provider, and "provide a direct backlink from each Content in the
 * Application to the relevant Content's page on the JAMENDO Platform".
 *
 * Local files render nothing — there is no one to credit.
 */

const openUrl = (url?: string) => {
  if (!url) return;
  Linking.openURL(url).catch(error => console.warn('Could not open link:', error));
};

interface TrackAttributionProps {
  track: MusicTrack;
}

export const TrackAttribution: React.FC<TrackAttributionProps> = memo(({ track }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleOpenTrack = useCallback(() => openUrl(track.sourceUrl), [track.sourceUrl]);
  const handleOpenLicense = useCallback(() => openUrl(track.licenseUrl), [track.licenseUrl]);

  if (track.source === 'local') return null;

  return (
    <View style={styles.container}>
      <ThemedText type="default" style={styles.credit} numberOfLines={2}>
        {track.artist} — provided by Jamendo
      </ThemedText>

      <View style={styles.links}>
        {track.sourceUrl && (
          <TouchableOpacity
            onPress={handleOpenTrack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="link"
            accessibilityLabel={`Open ${track.title} on Jamendo`}
          >
            <ThemedText style={[styles.link, { color: colors.tint }]}>View on Jamendo</ThemedText>
          </TouchableOpacity>
        )}
        {track.licenseUrl && (
          <TouchableOpacity
            onPress={handleOpenLicense}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="link"
            accessibilityLabel="Open the licence for this track"
          >
            <ThemedText style={[styles.link, { color: colors.tint }]}>Licence</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

TrackAttribution.displayName = 'TrackAttribution';

/** Listing-level credit, shown under a page of results. */
export const SourceCredit: React.FC<{ label: string }> = memo(({ label }) => (
  <View style={styles.footer}>
    <ThemedText type="default" style={styles.credit}>
      {label}
    </ThemedText>
  </View>
));

SourceCredit.displayName = 'SourceCredit';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 8,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  credit: {
    fontSize: 12,
    opacity: 0.6,
    flexShrink: 1,
  },
  link: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
});
