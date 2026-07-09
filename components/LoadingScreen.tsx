import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { IconSymbol } from './ui/IconSymbol';

export const LoadingScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation plus a looping spinner. Dismissal is driven by the
    // parent (app readiness), not a fixed timer, so this component just
    // animates while it is mounted.
    const loop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    loop.start();

    return () => loop.stop();
  }, [fadeAnim, scaleAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Music Icon with Rotation */}
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ rotate: spin }] },
          ]}
        >
          <IconSymbol
            size={80}
            name="music.note"
            color={colors.tint}
          />
        </Animated.View>

        {/* App Title */}
        <ThemedText type="title" style={[styles.title, { color: colors.tint }]}>
          Music App
        </ThemedText>

        {/* Subtitle */}
        <ThemedText type="default" style={[styles.subtitle, { color: colors.icon }]}>
          Your Personal Music Library
        </ThemedText>

         {/* Loading Indicator */}
         <View style={styles.loadingContainer}>
           <View style={[styles.loadingBar, { backgroundColor: colors.progressBarBackground }]}>
             <Animated.View
               style={[
                 styles.loadingProgress,
                 {
                   backgroundColor: colors.tint,
                   transform: [{
                     scaleX: fadeAnim.interpolate({
                       inputRange: [0, 1],
                       outputRange: [0, 1],
                     })
                   }],
                 },
               ]}
             />
           </View>
         </View>
      </Animated.View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 30,
    padding: 20,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
    opacity: 0.8,
  },
  loadingContainer: {
    width: 200,
    alignItems: 'center',
  },
  loadingBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    transformOrigin: 'left',
  },
});

export default LoadingScreen;
