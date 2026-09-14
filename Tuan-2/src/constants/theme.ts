/**
 * ================================================================
 * Theme Constants — Design System
 * ================================================================
 */

export const COLORS = {
  // Background & Surface
  background: '#0A0E1A',
  surface: '#111827',
  surfaceElevated: '#1A2235',
  surfaceGlass: 'rgba(26, 34, 53, 0.7)',

  // Primary Accent
  primary: '#6366F1',       // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  primaryGlow: 'rgba(99, 102, 241, 0.25)',

  // Semantic Colors
  success: '#10B981',       // Emerald
  successLight: '#34D399',
  successGlow: 'rgba(16, 185, 129, 0.2)',

  warning: '#F59E0B',       // Amber
  warningLight: '#FBBF24',
  warningGlow: 'rgba(245, 158, 11, 0.2)',

  danger: '#EF4444',        // Red
  dangerLight: '#F87171',
  dangerGlow: 'rgba(239, 68, 68, 0.3)',
  dangerPulse: 'rgba(239, 68, 68, 0.15)',

  info: '#3B82F6',          // Blue
  infoLight: '#60A5FA',
  infoGlow: 'rgba(59, 130, 246, 0.2)',

  // Gas specific
  gas: '#A855F7',           // Purple
  gasLight: '#C084FC',
  gasGlow: 'rgba(168, 85, 247, 0.2)',

  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#111827',

  // Borders
  border: '#1F2937',
  borderLight: '#374151',

  // Relay
  relayOn: '#10B981',
  relayOff: '#6B7280',

  // MQTT Status
  mqttConnected: '#10B981',
  mqttDisconnected: '#EF4444',
  mqttConnecting: '#F59E0B',

  // Tab bar
  tabActive: '#6366F1',
  tabInactive: '#4B5563',
  tabBackground: '#0F1525',
} as const;

export const GRADIENTS = {
  temperature: ['#F97316', '#EF4444'],   // Orange → Red
  humidity: ['#3B82F6', '#06B6D4'],      // Blue → Cyan
  gas: ['#A855F7', '#EC4899'],           // Purple → Pink
  relay: ['#10B981', '#059669'],         // Green shades
  alarm: ['#EF4444', '#DC2626'],         // Red shades
  header: ['#1E1B4B', '#312E81'],        // Deep indigo
  card: ['#1A2235', '#111827'],          // Dark surface
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  display: 36,
} as const;

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  }),
} as const;

export const ANIMATION = {
  /** Alarm blink interval — matches firmware: millis() % 300 (line 322) */
  alarmBlinkMs: 300,
  /** LED blink — matches firmware: (millis() / 200) % 2 (line 324) */
  ledBlinkMs: 200,
  /** Transition duration for smooth UI */
  transitionMs: 250,
  /** Spring config for toggles */
  spring: { damping: 15, stiffness: 150 },
} as const;
