/**
 * Clean iOS-inspired color scheme for the music app
 */

// Primary accent colors
const primaryLight = '#007AFF'; // iOS Blue
const primaryDark = '#0A84FF'; // iOS Blue Dark

// Secondary colors
const secondaryLight = '#FF3B30'; // iOS Red
const secondaryDark = '#FF453A'; // iOS Red Dark

export const Colors = {
  light: {
    // Primary colors
    text: '#000000', // Pure black
    background: '#F2F2F7', // iOS Light Gray
    surface: '#FFFFFF', // Pure white
    tint: primaryLight,
    
    // Secondary colors
    secondary: secondaryLight,
    accent: '#FF9500', // iOS Orange
    
    // UI elements
    icon: '#8E8E93', // iOS Gray
    border: '#C6C6C8', // iOS Light Gray
    card: '#FFFFFF', // Card background
    shadow: 'rgba(0, 0, 0, 0.1)',
    
    // Tab bar
    tabIconDefault: '#8E8E93',
    tabIconSelected: primaryLight,
    tabBarBackground: '#F2F2F7',
    
    // Music specific
    playingIndicator: primaryLight,
    progressBar: primaryLight,
    progressBarBackground: '#E5E5EA',
    
    // Status colors
    success: '#34C759', // iOS Green
    warning: '#FF9500', // iOS Orange
    error: '#FF3B30', // iOS Red
  },
  dark: {
    // Primary colors
    text: '#FFFFFF', // Pure white
    background: '#1C1C1E', // Lightened dark background
    surface: '#2C2C2E', // Lighter dark surface
    tint: primaryDark,
    
    // Secondary colors
    secondary: secondaryDark,
    accent: '#FF9F0A', // iOS Orange Dark
    
    // UI elements
    icon: '#E0E0E0', // Much lighter gray for better visibility
    border: '#48484A', // Lighter dark border
    card: '#2C2C2E', // Lighter card background
    shadow: 'rgba(0, 0, 0, 0.3)',
    
    // Tab bar
    tabIconDefault: '#E0E0E0', // Much lighter gray for better visibility
    tabIconSelected: primaryDark,
    tabBarBackground: '#2C2C2E',
    
    // Music specific
    playingIndicator: primaryDark,
    progressBar: primaryDark,
    progressBarBackground: '#48484A',
    
    // Status colors
    success: '#30D158', // iOS Green Dark
    warning: '#FF9F0A', // iOS Orange Dark
    error: '#FF453A', // iOS Red Dark
  },
};