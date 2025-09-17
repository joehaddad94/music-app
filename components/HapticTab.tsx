import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Animated } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = (ev: any) => {
    // Animate scale down
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    props.onPressIn?.(ev);
  };

  const handlePressOut = (ev: any) => {
    // Animate scale back up
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
    
    props.onPressOut?.(ev);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <PlatformPressable
        {...props}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          props.style,
          {
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 12,
            paddingVertical: 8,
            paddingHorizontal: 12,
          }
        ]}
      />
    </Animated.View>
  );
}
