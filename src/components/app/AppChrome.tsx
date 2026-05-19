import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bell, Settings, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AuthRoute } from '@/app/screens/AuthFlow';
import { AppBottomNav } from '@/components/app/AppBottomNav';
import { NotificationsPanel } from '@/components/app/NotificationsPanel';

type AppChromeProps = {
  children: React.ReactNode;
  currentRoute: AuthRoute;
  hideHeader?: boolean;
  onNavigate: (route: AuthRoute) => void;
};

type PanelMode = 'notifications' | null;
const headerRoutes: AuthRoute[] = ['home', 'reviewers', 'progress'];
const bottomNavRoutes: AuthRoute[] = [
  'home',
  'reviewers',
  'create-reviewer',
  'progress',
  'settings',
  'profile',
];
const SHEET_CLOSE_DISTANCE = 420;
const SHEET_CLOSE_THRESHOLD = SHEET_CLOSE_DISTANCE * 0.42;

export function AppChrome({ children, currentRoute, hideHeader, onNavigate }: AppChromeProps) {
  const insets = useSafeAreaInsets();
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const showHeader = headerRoutes.includes(currentRoute) && !hideHeader;
  const showBottomNav = bottomNavRoutes.includes(currentRoute);

  const openNotifications = () => {
    sheetTranslateY.setValue(0);
    setPanelMode('notifications');
  };
  const openSettings = () => onNavigate('settings');
  const closePanel = useCallback(
    (releaseVelocity?: number) => {
      const velocity = typeof releaseVelocity === 'number' ? releaseVelocity : 0;

      Animated.spring(sheetTranslateY, {
        toValue: SHEET_CLOSE_DISTANCE,
        friction: 6,
        tension: 45,
        velocity: velocity,
        useNativeDriver: true,
        overshootClamping: true,
      }).start(({ finished }) => {
        if (finished) setPanelMode(null);
      });
    },
    [sheetTranslateY]
  );
  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > Math.abs(gesture.dx) && gesture.dy > 2,
        onPanResponderGrant: () => {
          sheetTranslateY.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          sheetTranslateY.setValue(Math.min(SHEET_CLOSE_DISTANCE, Math.max(0, gesture.dy)));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy >= SHEET_CLOSE_THRESHOLD || gesture.vy > 1.1) {
            closePanel(gesture.vy);
            return;
          }

          Animated.spring(sheetTranslateY, {
            friction: 8,
            tension: 90,
            toValue: 0,
            velocity: gesture.vy,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(sheetTranslateY, {
            friction: 8,
            tension: 90,
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [closePanel, sheetTranslateY]
  );

  return (
    <View style={styles.root}>
      {showHeader ? (
        <View style={[styles.headerWrap, { paddingTop: insets.top + 10 }]}>
          <View style={styles.header}>
            <View style={styles.brandGroup}>
              <Image
                source={require('../../../assets/LightModeHorizontalLockupLogo.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.actionGroup}>
              <ChromeActionButton
                label="Notifications"
                icon={<Bell size={18} color="#0f172a" />}
                onPress={openNotifications}
              />
              <ChromeActionButton
                label="Settings"
                icon={<Settings size={18} color="#0f172a" />}
                onPress={openSettings}
              />
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.content}>{children}</View>

      {showBottomNav ? <AppBottomNav currentRoute={currentRoute} onNavigate={onNavigate} /> : null}

      <Modal
        visible={panelMode !== null}
        transparent
        animationType="none"
        onRequestClose={() => closePanel()}>
        <Pressable style={styles.backdrop} onPress={() => closePanel()} />

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(18, insets.bottom + 12),
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}>
          <View {...sheetPanResponder.panHandlers} style={styles.sheetHandleWrap}>
            <View style={styles.sheetHandle} />
          </View>

          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetEyebrow}>Inbox</Text>
              <Text style={styles.sheetTitle}>Notifications</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => closePanel()}
              style={styles.closeButton}>
              <X size={16} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {panelMode === 'notifications' ? <NotificationsPanel /> : null}
        </Animated.View>
      </Modal>
    </View>
  );
}

function ChromeActionButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.actionButton}>
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerWrap: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingRight: 14,
    paddingVertical: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  brandGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    height: 42,
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#0f172a',
  },
  brandDot: {
    height: 12,
    width: 12,
    borderRadius: 999,
    backgroundColor: '#2dd4bf',
    shadowColor: '#2dd4bf',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  brandLogo: {
    width: 140,
    height: 48,
    alignSelf: 'center',
  },
  brandName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  brandCaption: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    height: 42,
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#eef2f7',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  content: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.44)',
  },
  sheet: {
    marginTop: 'auto',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingBottom: 8,
    paddingTop: 4,
  },
  sheetHandle: {
    alignSelf: 'center',
    height: 5,
    width: 56,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
  },
  sheetHeader: {
    marginTop: 14,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetEyebrow: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sheetTitle: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  closeButton: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 14,
  },
  menuItemActive: {
    borderColor: '#86efac',
    backgroundColor: '#ecfdf5',
  },
  menuAccent: {
    height: 46,
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  menuAccentDot: {
    height: 14,
    width: 14,
    borderRadius: 999,
  },
  menuTextBlock: {
    flex: 1,
  },
  menuItemTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  menuItemSubtitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  menuCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 22,
    backgroundColor: '#ecfeff',
    padding: 16,
  },
  menuCardIcon: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(45, 212, 191, 0.16)',
  },
  menuCardBody: {
    flex: 1,
  },
  menuCardTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  menuCardSubtitle: {
    color: '#0f766e',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});

export default AppChrome;
