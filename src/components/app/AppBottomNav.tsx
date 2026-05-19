import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart3, Bot, FileText, Home, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AuthRoute } from '@/app/screens/AuthFlow';

type AppBottomNavProps = {
  currentRoute: AuthRoute;
  onNavigate: (route: AuthRoute) => void;
  pageBackgroundColor?: string;
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
    label: 'Chatbot',
    route: 'ai-chat',
    icon: (color) => <Bot size={18} color={color} />,
  },
  {
    label: 'Progress',
    route: 'progress',
    icon: (color) => <BarChart3 size={18} color={color} />,
  },
];
const sideNavItems = navItems.filter((item) => item.route !== 'create-reviewer');
const createNavItem = navItems.find((item) => item.route === 'create-reviewer')!;

export function AppBottomNav({ currentRoute, onNavigate, pageBackgroundColor }: AppBottomNavProps) {
  const insets = useSafeAreaInsets();
  const createActive = currentRoute === createNavItem.route;
  const createAnim = useRef(new Animated.Value(createActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(createAnim, {
      friction: 7,
      tension: 120,
      toValue: createActive ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [createActive, createAnim]);

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: pageBackgroundColor ?? 'transparent',
          paddingBottom: Math.max(10, insets.bottom + 8),
        },
      ]}>
      <View style={styles.nav}>
        <View style={styles.navInner}>
          <View style={styles.leftNavGroup}>
            {sideNavItems.slice(0, 2).map((item) => {
              const active = item.route === currentRoute;
              const color = active ? '#004f4c' : '#64748b';

              return (
                <NavSideItem
                  key={item.route}
                  active={active}
                  color={color}
                  item={item}
                  onNavigate={onNavigate}
                />
              );
            })}
          </View>

          <View pointerEvents="box-none" style={styles.centerCreateLayer}>
            <View pointerEvents="box-none" style={styles.centerCreateWrap}>
              <Animated.View
                style={{
                  transform: [
                    {
                      translateY: createAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -2],
                      }),
                    },
                    {
                      scale: createAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.04],
                      }),
                    },
                  ],
                }}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel={createNavItem.label}
                  onPress={() => onNavigate(createNavItem.route)}
                  style={[styles.createFab, createActive && styles.createFabActive]}>
                  <Plus size={28} color="#ffffff" strokeWidth={2.7} />
                </TouchableOpacity>
              </Animated.View>
              <Text
                allowFontScaling={false}
                numberOfLines={1}
                style={[styles.createLabel, createActive && styles.navLabelActive]}>
                Create
              </Text>
            </View>
          </View>

          <View style={styles.rightNavGroup}>
            {sideNavItems.slice(2).map((item) => {
              const active = item.route === currentRoute;
              const color = active ? '#004f4c' : '#64748b';

              return (
                <NavSideItem
                  key={item.route}
                  active={active}
                  color={color}
                  item={item}
                  onNavigate={onNavigate}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function NavSideItem({
  active,
  color,
  item,
  onNavigate,
}: {
  active: boolean;
  color: string;
  item: NavItemConfig;
  onNavigate: (route: AuthRoute) => void;
}) {
  const activeAnim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(activeAnim, {
      friction: 8,
      tension: 120,
      toValue: active ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [active, activeAnim]);

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={() => onNavigate(item.route)}
      style={styles.navItem}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.navItemActivePill,
          {
            opacity: activeAnim,
            transform: [
              {
                scale: activeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.86, 1],
                }),
              },
            ],
          },
        ]}
      />
      {item.icon(color)}
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[styles.navLabel, active && styles.navLabelActive]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
    bottom: 0,
    elevation: 20,
    left: 0,
    paddingHorizontal: 14,
    position: 'absolute',
    right: 0,
    zIndex: 20,
  },
  nav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  navInner: {
    alignItems: 'center',
    backgroundColor: 'rgb(255, 255, 255)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 34,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 76,
    overflow: 'visible',
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: 'relative',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 9,
  },
  leftNavGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    paddingRight: 44,
  },
  rightNavGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'flex-end',
    paddingLeft: 44,
  },
  centerCreateLayer: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 3,
  },
  centerCreateWrap: {
    alignItems: 'center',
    bottom: 8,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 3,
  },
  createFab: {
    alignItems: 'center',
    backgroundColor: '#004f4c',
    borderColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 5,
    elevation: 12,
    height: 70,
    justifyContent: 'center',
    shadowColor: '#004f4c',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    width: 70,
  },
  createFabActive: {
    backgroundColor: '#006c67',
  },
  createLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    height: 56,
    justifyContent: 'center',
    minWidth: 58,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 8,
    zIndex: 1,
  },
  navItemActivePill: {
    backgroundColor: '#d9fbff',
    borderRadius: 999,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  navLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 3,
  },
  navLabelActive: {
    color: '#004f4c',
  },
});
