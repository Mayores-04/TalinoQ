import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { BarChart3, Bot, FileText, Home, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AuthRoute } from '@/app/screens/AuthFlow';
import {
  getAiChatDragReminderEnabled,
  subscribeToAiChatDragReminderPreference,
} from '@/lib/preferences';

type AppBottomNavProps = {
  currentRoute: AuthRoute;
  onNavigate: (route: AuthRoute) => void;
};

type NavItemConfig = {
  label: string;
  route: AuthRoute;
  icon: (color: string) => React.ReactNode;
};

const navItems: NavItemConfig[] = [
  {
    label: 'Home',
    route: 'home',
    icon: (color) => <Home size={18} color={color} />,
  },
  {
    label: 'Reviewers',
    route: 'reviewers',
    icon: (color) => <FileText size={18} color={color} />,
  },
  {
    label: 'Create',
    route: 'create-reviewer',
    icon: (color) => <Plus size={19} color={color} />,
  },
  {
    label: 'Progress',
    route: 'progress',
    icon: (color) => <BarChart3 size={18} color={color} />,
  },
];

export function AppBottomNav({ currentRoute, onNavigate }: AppBottomNavProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastPosition = useRef({ x: 0, y: 0 });

  const waveTranslateX = useRef(new Animated.Value(0)).current;
  const dropletScale = useRef(new Animated.Value(0.75)).current;
  const dropletOpacity = useRef(new Animated.Value(0)).current;
  const wavePulse = useRef(new Animated.Value(1)).current;

  const [showDragReminder, setShowDragReminder] = useState(false);
  const [navWidth, setNavWidth] = useState(0);

  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => item.route === currentRoute)
  );

  const itemWidth = navWidth > 0 ? navWidth / navItems.length : 0;

  const bounds = useMemo(
    () => ({
      maxX: 0,
      maxY: 38,
      minX: -Math.max(0, width - 106),
      minY: -150,
    }),
    [width]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
        onPanResponderMove: (_, gesture) => {
          position.setValue({
            x: clamp(lastPosition.current.x + gesture.dx, bounds.minX, bounds.maxX),
            y: clamp(lastPosition.current.y + gesture.dy, bounds.minY, bounds.maxY),
          });
        },
        onPanResponderRelease: (_, gesture) => {
          const nextPosition = {
            x: clamp(lastPosition.current.x + gesture.dx, bounds.minX, bounds.maxX),
            y: clamp(lastPosition.current.y + gesture.dy, bounds.minY, bounds.maxY),
          };

          lastPosition.current = nextPosition;
          position.setValue(nextPosition);
        },
        onPanResponderTerminate: (_, gesture) => {
          const nextPosition = {
            x: clamp(lastPosition.current.x + gesture.dx, bounds.minX, bounds.maxX),
            y: clamp(lastPosition.current.y + gesture.dy, bounds.minY, bounds.maxY),
          };

          lastPosition.current = nextPosition;
          position.setValue(nextPosition);
        },
      }),
    [bounds, position]
  );

  useEffect(() => {
    if (!itemWidth) return;

    Animated.parallel([
      Animated.spring(waveTranslateX, {
        toValue: activeIndex * itemWidth,
        useNativeDriver: true,
        speed: 14,
        bounciness: 9,
      }),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(dropletOpacity, {
            toValue: 1,
            duration: 120,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dropletScale, {
            toValue: 1.18,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(wavePulse, {
            toValue: 1.08,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(dropletOpacity, {
            toValue: 0,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(dropletScale, {
            toValue: 1.65,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(wavePulse, {
            toValue: 1,
            useNativeDriver: true,
            speed: 16,
            bounciness: 7,
          }),
        ]),
      ]),
    ]).start(() => {
      dropletScale.setValue(0.75);
    });
  }, [activeIndex, itemWidth, waveTranslateX, dropletOpacity, dropletScale, wavePulse]);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let isMounted = true;

    const showReminder = (enabled: boolean) => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }

      if (!isMounted || !enabled) {
        setShowDragReminder(false);
        return;
      }

      setShowDragReminder(true);
      hideTimer = setTimeout(() => {
        setShowDragReminder(false);
      }, 5000);
    };

    getAiChatDragReminderEnabled().then(showReminder);

    const unsubscribe = subscribeToAiChatDragReminderPreference(showReminder);

    return () => {
      isMounted = false;
      unsubscribe();

      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, []);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(10, insets.bottom + 8) }]}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.aiDragWrap, { transform: position.getTranslateTransform() }]}>
        {showDragReminder ? (
          <View pointerEvents="none" style={styles.dragReminder}>
            <Text style={styles.dragReminderTitle}>Tip</Text>
            <Text style={styles.dragReminderText}>Drag the AI button anywhere nearby.</Text>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel="AI Chat"
          onPress={() => onNavigate('ai-chat')}
          style={styles.aiButton}>
          <Bot size={24} color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.nav} onLayout={(event) => setNavWidth(event.nativeEvent.layout.width)}>
        {itemWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.waveTrack,
              {
                width: itemWidth,
                transform: [
                  { translateX: waveTranslateX },
                  { scaleX: wavePulse },
                  { scaleY: wavePulse },
                ],
              },
            ]}>
            <View style={styles.waveBlob} />
            <View style={styles.waveBubbleOne} />
            <View style={styles.waveBubbleTwo} />

            <Animated.View
              style={[
                styles.waterDrop,
                {
                  opacity: dropletOpacity,
                  transform: [{ scale: dropletScale }],
                },
              ]}
            />
          </Animated.View>
        ) : null}

        {navItems.map((item) => {
          const active = item.route === currentRoute;
          const color = active ? '#004f4c' : '#64748b';

          return (
            <TouchableOpacity
              key={item.route}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => onNavigate(item.route)}
              style={styles.navItem}>
              {item.icon(color)}
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  aiDragWrap: {
    position: 'absolute',
    right: 24,
    top: -60,
    zIndex: 2,
  },
  aiButton: {
    alignItems: 'center',
    backgroundColor: '#004f4c',
    borderColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 4,
    elevation: 9,
    height: 60,
    justifyContent: 'center',
    shadowColor: '#004f4c',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    width: 60,
  },
  dragReminder: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    bottom: 68,
    paddingHorizontal: 12,
    paddingVertical: 9,
    position: 'absolute',
    right: 0,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    width: 184,
    elevation: 6,
  },
  dragReminderTitle: {
    color: '#004f4c',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dragReminderText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    marginTop: 3,
  },
  nav: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  waveTrack: {
    bottom: 6,
    left: 0,
    position: 'absolute',
    top: 6,
    zIndex: 0,
  },
  waveBlob: {
    backgroundColor: '#d9fbff',
    borderColor: 'rgba(0, 79, 76, 0.08)',
    borderRadius: 999,
    borderWidth: 1,
    bottom: 0,
    left: 6,
    position: 'absolute',
    right: 6,
    top: 0,
  },
  waveBubbleOne: {
    backgroundColor: '#bff5fb',
    borderRadius: 999,
    height: 18,
    opacity: 0.7,
    position: 'absolute',
    right: 15,
    top: 5,
    width: 18,
  },
  waveBubbleTwo: {
    backgroundColor: '#effeff',
    borderRadius: 999,
    bottom: 8,
    height: 10,
    opacity: 0.9,
    position: 'absolute',
    left: 18,
    width: 10,
  },
  waterDrop: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 79, 76, 0.12)',
    borderRadius: 999,
    height: 44,
    marginTop: 2,
    width: 44,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 7,
    zIndex: 1,
  },
  navLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#004f4c',
  },
});
