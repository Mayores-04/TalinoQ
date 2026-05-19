import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import {
  AlertTriangle,
  BookOpenCheck,
  Sparkles,
  Bot,
  FileText,
  Library,
} from 'lucide-react-native';
import { Box, HStack, VStack } from '@/components/ui/box';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useLiveNotifications, type AppNotificationRoute } from '@/hooks/useLiveNotifications';
import type { AppNotification } from '@/lib/appNotifications';

type NotificationsPanelProps = {
  onOpenRoute: (route: AppNotificationRoute) => void;
};

type NotificationFilter =
  | 'all'
  | 'unread'
  | 'insight'
  | 'library'
  | 'material'
  | 'reviewer'
  | 'chat';

const filterOptions: Array<{ label: string; value: NotificationFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Chats', value: 'chat' },
  { label: 'Reviewers', value: 'reviewer' },
  { label: 'Materials', value: 'material' },
  { label: 'Libraries', value: 'library' },
  { label: 'Insights', value: 'insight' },
];

export function NotificationsPanel({ onOpenRoute }: NotificationsPanelProps) {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');

  const { refreshing, refresh } = usePullToRefresh({
    onRefresh: () => setRefreshNonce((value) => value + 1),
  });
  const {
    hasLoadedAll,
    markAllAsRead,
    markNotificationAsRead,
    notifications,
    summarySubtitle,
    summaryTitle,
    unreadCount,
  } = useLiveNotifications(refreshNonce);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') {
      return notifications;
    }

    if (activeFilter === 'unread') {
      return notifications.filter((notification) => notification.unread);
    }

    return notifications.filter((notification) => notification.kind === activeFilter);
  }, [activeFilter, notifications]);

  return (
    <View style={styles.panelRoot}>
      <View style={styles.notificationSummary}>
        <View style={styles.summaryTextBlock}>
          <Text style={styles.summaryTitle}>{summaryTitle}</Text>
          <Text style={styles.summarySubtitle}>{summarySubtitle}</Text>
        </View>
        <View style={styles.summaryBadge}>
          <Sparkles size={17} color="#ffffff" />
        </View>
      </View>

      <View style={styles.filtersHeader}>
        <Text style={styles.filtersTitle}>Filter</Text>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={markAllAsRead}
          disabled={unreadCount === 0}
          style={[styles.readAllButton, unreadCount === 0 && styles.readAllButtonDisabled]}>
          <Text
            style={[
              styles.readAllButtonText,
              unreadCount === 0 && styles.readAllButtonTextDisabled,
            ]}>
            Read all
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}>
        {filterOptions.map((option) => {
          const active = activeFilter === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.85}
              onPress={() => setActiveFilter(option.value)}
              style={[styles.filterChip, active && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.listScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#004f4c"
            colors={['#004f4c']}
          />
        }>
        {!hasLoadedAll ? (
          <View style={styles.loadingCard}>
            <View style={styles.loadingIcon}>
              <Sparkles size={16} color="#004f4c" />
            </View>
            <View style={styles.loadingTextBlock}>
              <Text style={styles.loadingTitle}>Syncing live updates</Text>
              <Text style={styles.loadingSubtitle}>Pulling your latest Firestore data now.</Text>
            </View>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Sparkles size={24} color="#004f4c" />
            <Text style={styles.emptyStateTitle}>No notifications yet</Text>
            <Text style={styles.emptyStateText}>
              Create a reviewer, save a material, or continue studying to see live updates here.
            </Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Sparkles size={24} color="#004f4c" />
            <Text style={styles.emptyStateTitle}>No matches</Text>
            <Text style={styles.emptyStateText}>
              Try another filter or tap Read all to clear the unread items.
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => (
            <ChromeNotificationItem
              key={notification.id}
              icon={getNotificationIcon(notification)}
              title={notification.title}
              subtitle={notification.subtitle}
              time={notification.timeLabel}
              tone={notification.tone}
              actionLabel={notification.actionLabel}
              unread={notification.unread}
              onPress={() => {
                try {
                  markNotificationAsRead(notification.id);
                } catch {
                  // ignore
                }

                onOpenRoute(notification.targetRoute);
              }}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function getNotificationIcon(notification: AppNotification) {
  switch (notification.kind) {
    case 'insight':
      return <AlertTriangle size={18} color="#b45309" />;
    case 'library':
      return <Library size={18} color="#004f4c" />;
    case 'material':
      return <FileText size={18} color="#006f6a" />;
    case 'reviewer':
      return <BookOpenCheck size={18} color="#004f4c" />;
    case 'chat':
    default:
      return <Bot size={18} color="#0f766e" />;
  }
}

export function ChromeNotificationItem({
  actionLabel,
  icon,
  unread,
  title,
  subtitle,
  time,
  tone,
  onPress,
}: {
  actionLabel: string;
  icon: React.ReactNode;
  unread?: boolean;
  title: string;
  subtitle: string;
  time: string;
  tone: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.notificationItem, unread && styles.notificationItemUnread]}>
      <Box style={[styles.notificationAccent, { backgroundColor: tone }]} />

      <Box style={[styles.notificationIcon, { backgroundColor: `${tone}1f` }]}>{icon}</Box>

      <VStack style={styles.notificationTextBlock}>
        <HStack style={styles.notificationTitleRow}>
          <Text style={styles.notificationTitle}>{title}</Text>
          {unread ? <View style={styles.unreadDot} /> : null}
        </HStack>

        <Text style={styles.notificationSubtitle}>{subtitle}</Text>

        <HStack style={styles.notificationFooter}>
          <Text style={styles.notificationTime}>{time}</Text>
          <Box style={styles.notificationAction}>
            <Text style={styles.notificationActionText}>{actionLabel}</Text>
          </Box>
        </HStack>
      </VStack>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  panelRoot: {
    flex: 1,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
    gap: 12,
  },
  filtersHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  filtersTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
  },
  readAllButton: {
    backgroundColor: '#e6fbf8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  readAllButtonDisabled: {
    backgroundColor: '#f1f5f9',
  },
  readAllButtonText: {
    color: '#006f6a',
    fontSize: 11,
    fontWeight: '900',
  },
  readAllButtonTextDisabled: {
    color: '#94a3b8',
  },
  filterRow: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 2,
    paddingRight: 4,
  },
  filterScroll: {
    flexGrow: 0,
    height: 52,
    marginBottom: 2,
  },
  filterChip: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: '#004f4c',
    borderColor: '#004f4c',
  },
  filterChipText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  notificationSummary: {
    alignItems: 'center',
    backgroundColor: '#eefafa',
    borderColor: '#d6eeee',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  summaryTextBlock: {
    flex: 1,
  },
  summaryTitle: {
    color: '#004f4c',
    fontSize: 15,
    fontWeight: '900',
  },
  summarySubtitle: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  summaryBadge: {
    alignItems: 'center',
    backgroundColor: '#006f6a',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dbe8ee',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  loadingIcon: {
    alignItems: 'center',
    backgroundColor: '#eefafa',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  loadingTextBlock: {
    flex: 1,
  },
  loadingTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
  },
  loadingSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dbe8ee',
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 20,
  },
  emptyStateTitle: {
    color: '#004f4c',
    fontSize: 15,
    fontWeight: '900',
  },
  emptyStateText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  notificationItem: {
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    overflow: 'hidden',
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  notificationItemUnread: {
    borderColor: '#bcefeb',
    backgroundColor: '#fbffff',
  },
  notificationAccent: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  notificationIcon: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  notificationTextBlock: {
    flex: 1,
  },
  notificationTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  notificationTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  notificationSubtitle: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  unreadDot: {
    backgroundColor: '#42d8e7',
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  notificationFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  notificationTime: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  notificationAction: {
    backgroundColor: '#e3fbff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  notificationActionText: {
    color: '#004f4c',
    fontSize: 10,
    fontWeight: '900',
  },
});

export default NotificationsPanel;
