import React from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { BookOpenCheck, AlertTriangle, Cloud, Sparkles } from 'lucide-react-native';
import { Box, HStack, VStack } from '@/components/ui/box';
import { LoadingSkeleton } from '@/components/app/LoadingSkeleton';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSkeletonLoading } from '@/hooks/useSkeletonLoading';

export function NotificationsPanel() {
  const initialLoading = useSkeletonLoading();
  const { refreshing, refresh } = usePullToRefresh();
  const isLoading = initialLoading || refreshing;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.panelContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor="#004f4c"
          colors={['#004f4c']}
        />
      }>
      {isLoading ? (
        <NotificationsSkeleton />
      ) : (
        <>
          <View style={styles.notificationSummary}>
            <View>
              <Text style={styles.summaryTitle}>3 new study updates</Text>
              <Text style={styles.summarySubtitle}>
                Your reviewers, weak topics, and cloud sync are current.
              </Text>
            </View>
            <View style={styles.summaryBadge}>
              <Sparkles size={17} color="#ffffff" />
            </View>
          </View>

          <ChromeNotificationItem
            icon={<BookOpenCheck size={18} color="#004f4c" />}
            title="Review session ready"
            subtitle="Your latest reviewer is synced and ready to continue."
            time="2m ago"
            tone="#14b8a6"
            actionLabel="Open"
            unread
          />
          <ChromeNotificationItem
            icon={<AlertTriangle size={18} color="#b45309" />}
            title="Weak topic detected"
            subtitle="Cell respiration still needs another pass."
            time="18m ago"
            tone="#ee845e"
            actionLabel="Review"
            unread
          />
          <ChromeNotificationItem
            icon={<Cloud size={18} color="#006f6a" />}
            title="Backup complete"
            subtitle="Your study data has been saved to the cloud."
            time="Today"
            tone="#42d8e7"
            actionLabel="Details"
          />
        </>
      )}
    </ScrollView>
  );
}

function NotificationsSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <View style={styles.notificationSummary}>
        <View style={styles.notificationTextBlock}>
          <LoadingSkeleton height={18} width="62%" radius={8} />
          <LoadingSkeleton height={13} width="90%" radius={6} style={styles.skeletonTextGap} />
        </View>
        <LoadingSkeleton height={40} width={40} radius={999} />
      </View>

      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.notificationItem}>
          <LoadingSkeleton height={42} width={42} radius={12} />
          <View style={styles.notificationTextBlock}>
            <LoadingSkeleton height={17} width="68%" radius={8} />
            <LoadingSkeleton height={13} width="96%" radius={6} style={styles.skeletonTextGap} />
            <LoadingSkeleton height={11} width="48%" radius={5} style={styles.skeletonFooterGap} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ChromeNotificationItem({
  actionLabel,
  icon,
  unread,
  title,
  subtitle,
  time,
  tone,
}: {
  actionLabel: string;
  icon: React.ReactNode;
  unread?: boolean;
  title: string;
  subtitle: string;
  time: string;
  tone: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
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
  panelContent: {
    paddingBottom: 12,
    gap: 12,
  },
  skeletonWrap: {
    gap: 12,
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
  notificationDot: {
    marginTop: 5,
    height: 12,
    width: 12,
    borderRadius: 999,
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
  skeletonTextGap: {
    marginTop: 7,
  },
  skeletonFooterGap: {
    marginTop: 16,
  },
});

export default NotificationsPanel;
