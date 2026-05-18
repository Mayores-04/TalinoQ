import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, BarChart3, BookOpen, Layers3, Sparkles, Target } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingSkeleton } from '@/components/app/LoadingSkeleton';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSkeletonLoading } from '@/hooks/useSkeletonLoading';
import { subscribeToReviewers, type ReviewerRecord } from '@/lib/reviewers';
import { buildStudyAnalytics, type StudyAnalytics } from '@/lib/studyAnalytics';

type HomeDashboardProps = {
  userName?: string;
  onCreateReviewer?: () => void;
  onOpenReviewers?: () => void;
  onOpenProgress?: () => void;
  onOpenAIChat?: () => void;
  onOpenWeakTopics?: () => void;
};

export function HomeDashboard({
  userName = 'Jake',
  onCreateReviewer,
  onOpenReviewers,
  onOpenProgress,
  onOpenAIChat,
  onOpenWeakTopics,
}: HomeDashboardProps) {
  const initialLoading = useSkeletonLoading();
  const { refreshing, refresh } = usePullToRefresh();
  const [recentReviewers, setRecentReviewers] = useState<ReviewerRecord[]>([]);
  const [analytics, setAnalytics] = useState<StudyAnalytics>(() => buildStudyAnalytics([]));
  const [reviewersLoading, setReviewersLoading] = useState(true);
  const isLoading = initialLoading || refreshing || reviewersLoading;

  useEffect(() => {
    return subscribeToReviewers(
      (reviewers) => {
        setRecentReviewers(reviewers.slice(0, 2));
        setAnalytics(buildStudyAnalytics(reviewers));
        setReviewersLoading(false);
      },
      () => {
        setRecentReviewers([]);
        setAnalytics(buildStudyAnalytics([]));
        setReviewersLoading(false);
      }
    );
  }, []);

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#064e4a"
            colors={['#064e4a']}
          />
        }
        showsVerticalScrollIndicator={false}>
        {isLoading ? <HomeDashboardSkeleton /> : null}

        {!isLoading ? (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Welcome back, {userName}</Text>
              <Text style={styles.subtitle}>
                {analytics.studyStreak > 0
                  ? `You're on a ${analytics.studyStreak}-day study streak. Keep it up!`
                  : 'Create or update a reviewer today to start your study streak.'}
              </Text>
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickPrimary}
                activeOpacity={0.85}
                onPress={onCreateReviewer}>
                <Target size={13} color="#064e4a" />
                <Text style={styles.quickPrimaryText}>Create final exam reviewer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickSecondary}
                activeOpacity={0.85}
                onPress={onOpenWeakTopics}>
                <Layers3 size={13} color="#334155" />
                <Text style={styles.quickSecondaryText}>Review weak topics</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.heroCard}
              activeOpacity={0.9}
              onPress={onCreateReviewer}>
              <View style={styles.heroIcon}>
                <Sparkles size={18} color="#d1fae5" />
              </View>

              <Text style={styles.heroTitle}>Create New Reviewer</Text>
              <Text style={styles.heroDescription}>
                Let our AI transform your notes into a structured study guide in seconds.
              </Text>

              <View style={styles.heroButton}>
                <Text style={styles.heroButtonText}>Start AI Generation</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>EXAM READINESS</Text>
                <Text style={styles.statValue}>{analytics.examReadiness}%</Text>
                <Text style={styles.statStatus}>
                  {analytics.examReadiness >= 80 ? 'Great Progress' : 'Needs Focus'}
                </Text>
                <Text style={styles.statDescription}>
                  Based on {analytics.reviewerCount} saved reviewer
                  {analytics.reviewerCount === 1 ? '' : 's'} and subject mastery.
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statHeaderRow}>
                  <Text style={styles.statLabel}>WEEKLY ACTIVITY</Text>
                  <BarChart3 size={12} color="#064e4a" />
                </View>

                <View style={styles.chartRow}>
                  {analytics.weeklyActivity.slice(1).map((day, index) => (
                    <View
                      key={`${day.label}-${index}`}
                      style={[
                        styles.chartBar,
                        {
                          height: Math.max(12, Math.round(day.value * 0.66)),
                          backgroundColor: getActivityColor(day.value),
                        },
                      ]}
                    />
                  ))}
                </View>

                <View style={styles.daysRow}>
                  {analytics.weeklyActivity.slice(1).map((day, index) => (
                    <Text key={`${day}-${index}`} style={styles.dayText}>
                      {day.label}
                    </Text>
                  ))}
                </View>

                <View style={styles.streakBadge}>
                  <Text style={styles.streakTitle}>{analytics.studyStreak} Day Streak</Text>
                  <Text style={styles.streakSubtitle}>
                    {analytics.totalItems} items - {analytics.totalQuestions} AI questions
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Reviewers</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={onOpenReviewers}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentReviewers.length > 0 ? (
              recentReviewers.map((reviewer) => (
                <ReviewerCard key={reviewer.id} reviewer={reviewer} />
              ))
            ) : (
              <View style={styles.emptyReviewerCard}>
                <Text style={styles.emptyReviewerTitle}>No saved reviewers yet</Text>
                <Text style={styles.emptyReviewerText}>
                  Create your first reviewer and it will appear here automatically.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={onCreateReviewer}
                  style={styles.emptyReviewerButton}>
                  <Text style={styles.emptyReviewerButtonText}>Create Reviewer</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.weakCard}>
              <View style={styles.weakHeader}>
                <AlertTriangle size={18} color="#dc2626" />
                <Text style={styles.weakTitle}>Weak Topics</Text>
              </View>

              <Text style={styles.weakSubtitle}>Focus on these to boost your readiness score.</Text>

              {analytics.weakSubjects.length > 0 ? (
                analytics.weakSubjects
                  .slice(0, 2)
                  .map((subject, index) => (
                    <WeakTopicRow
                      key={subject.id}
                      title={subject.name}
                      percentage={`${subject.averageMastery}%`}
                      tone={index === 0 ? 'danger' : 'warning'}
                    />
                  ))
              ) : (
                <Text style={styles.noWeakText}>
                  No weak subjects yet. Keep building reviewers.
                </Text>
              )}

              <TouchableOpacity
                style={styles.reviewNextButton}
                activeOpacity={0.85}
                onPress={onOpenWeakTopics}>
                <Text style={styles.reviewNextText}>
                  {analytics.weakSubjects[0]
                    ? `Review ${analytics.weakSubjects[0].name}`
                    : 'Open Progress'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeDashboardSkeleton() {
  return (
    <View>
      <View style={styles.header}>
        <LoadingSkeleton height={29} width="72%" radius={9} />
        <LoadingSkeleton height={14} width="86%" radius={7} style={styles.skeletonTopGap} />
      </View>

      <View style={styles.quickActions}>
        <LoadingSkeleton height={52} style={styles.flexSkeleton} radius={12} />
        <LoadingSkeleton height={52} style={styles.flexSkeleton} radius={12} />
      </View>

      <LoadingSkeleton height={172} radius={16} style={styles.skeletonHero} />

      <View style={styles.statsRow}>
        <LoadingSkeleton height={170} radius={16} style={styles.flexSkeleton} />
        <LoadingSkeleton height={170} radius={16} style={styles.flexSkeleton} />
      </View>

      <View style={styles.sectionHeader}>
        <LoadingSkeleton height={26} width="50%" radius={8} />
        <LoadingSkeleton height={14} width={54} radius={7} />
      </View>

      <LoadingSkeleton height={120} radius={12} style={styles.skeletonCardGap} />
      <LoadingSkeleton height={120} radius={12} style={styles.skeletonCardGap} />
      <LoadingSkeleton height={190} radius={16} style={styles.skeletonHero} />
    </View>
  );
}

function ReviewerCard({ reviewer }: { reviewer: ReviewerRecord }) {
  const accent = getReviewerAccent(reviewer);
  const progress = Math.min(100, Math.max(0, reviewer.masteryScore));

  return (
    <TouchableOpacity
      style={[styles.reviewerCard, { borderLeftColor: accent }]}
      activeOpacity={0.85}>
      <View style={styles.reviewerTop}>
        <View style={styles.subjectRow}>
          <BookOpen size={11} color="#64748b" />
          <Text style={styles.subjectText}>{reviewer.subject}</Text>
        </View>
        <Text style={styles.updatedText}>{formatUpdatedAt(reviewer)}</Text>
      </View>

      <Text style={styles.reviewerTitle}>{reviewer.title}</Text>
      <Text style={styles.reviewerDetails}>
        {reviewer.estimatedItems} items - {reviewer.category}
      </Text>

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%` as `${number}%`, backgroundColor: accent },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{progress}%</Text>
      </View>
    </TouchableOpacity>
  );
}

function getReviewerAccent(reviewer: ReviewerRecord) {
  if (reviewer.status === 'Exported') {
    return '#007a80';
  }

  if (reviewer.difficulty === 'Hard') {
    return '#7c3aed';
  }

  return reviewer.difficulty === 'Easy' ? '#4ade80' : '#99f6e4';
}

function getActivityColor(value: number) {
  if (value >= 80) {
    return '#064e4a';
  }

  if (value >= 45) {
    return '#99f6e4';
  }

  if (value > 0) {
    return '#d9f99d';
  }

  return '#dbeafe';
}

function formatUpdatedAt(reviewer: ReviewerRecord) {
  const dateValue = reviewer.updatedAt ?? reviewer.createdAt;

  if (!dateValue) {
    return 'Saved recently';
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 'Saved recently';
  }

  return `Updated ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function WeakTopicRow({
  title,
  percentage,
  tone,
}: {
  title: string;
  percentage: string;
  tone: 'danger' | 'warning';
}) {
  const iconBg = tone === 'danger' ? '#fee2e2' : '#ffedd5';
  const textColor = tone === 'danger' ? '#dc2626' : '#92400e';

  return (
    <View style={styles.weakRow}>
      <View style={[styles.weakTopicIcon, { backgroundColor: iconBg }]}>
        <AlertTriangle size={13} color={textColor} />
      </View>

      <Text style={styles.weakTopicTitle}>{title}</Text>
      <Text style={[styles.weakPercent, { color: textColor }]}>{percentage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 2,
  },
  header: {
    paddingTop: 4,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  quickPrimary: {
    alignItems: 'center',
    backgroundColor: '#63f285',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 10,
  },
  quickPrimaryText: {
    color: '#064e4a',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  quickSecondary: {
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderColor: '#d7dce7',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 10,
  },
  quickSecondaryText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroCard: {
    backgroundColor: '#00483f',
    borderRadius: 16,
    marginTop: 22,
    minHeight: 172,
    padding: 22,
    shadowColor: '#064e4a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginBottom: 22,
    width: 36,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 23,
    fontWeight: '900',
  },
  heroDescription: {
    color: '#d1fae5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 280,
  },
  heroButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#63f285',
    borderRadius: 10,
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  heroButtonText: {
    color: '#064e4a',
    fontSize: 12,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    flex: 1,
    minHeight: 170,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  statHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    color: '#334155',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#064e4a',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 34,
    textAlign: 'center',
  },
  statStatus: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  statDescription: {
    color: '#64748b',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 22,
    textAlign: 'center',
  },
  chartRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    height: 74,
    justifyContent: 'center',
    marginTop: 12,
  },
  chartBar: {
    borderRadius: 2,
    width: 18,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 13,
    marginTop: 8,
  },
  dayText: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '800',
  },
  streakBadge: {
    alignSelf: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  streakTitle: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  streakSubtitle: {
    color: '#64748b',
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  viewAll: {
    color: '#064e4a',
    fontSize: 11,
    fontWeight: '900',
  },
  emptyReviewerCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe2ea',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  emptyReviewerTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  emptyReviewerText: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  emptyReviewerButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#064e4a',
    borderRadius: 999,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  emptyReviewerButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  reviewerCard: {
    backgroundColor: '#f8f7ff',
    borderColor: '#dbe2ea',
    borderLeftWidth: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  reviewerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subjectRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  subjectText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  updatedText: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
  },
  reviewerTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 10,
  },
  reviewerDetails: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 8,
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  progressTrack: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 999,
    height: '100%',
  },
  progressText: {
    color: '#0f172a',
    fontSize: 9,
    fontWeight: '900',
  },
  weakCard: {
    backgroundColor: '#f1efff',
    borderRadius: 16,
    marginTop: 22,
    padding: 18,
  },
  weakHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  weakTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  weakSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 6,
    marginBottom: 14,
  },
  weakRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 12,
  },
  weakTopicIcon: {
    alignItems: 'center',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  weakTopicTitle: {
    color: '#334155',
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  weakPercent: {
    fontSize: 12,
    fontWeight: '900',
  },
  reviewNextButton: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 6,
  },
  reviewNextText: {
    color: '#064e4a',
    fontSize: 12,
    fontWeight: '800',
  },
  noWeakText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    paddingVertical: 10,
  },
  flexSkeleton: {
    flex: 1,
  },
  skeletonTopGap: {
    marginTop: 8,
  },
  skeletonHero: {
    marginTop: 22,
  },
  skeletonCardGap: {
    marginBottom: 12,
  },
});
