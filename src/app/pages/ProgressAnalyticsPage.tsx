import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calculator, Lightbulb, Rocket, Sigma } from 'lucide-react-native';
import { LoadingSkeleton } from '@/components/app/LoadingSkeleton';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSkeletonLoading } from '@/hooks/useSkeletonLoading';
import { subscribeToReviewers } from '@/lib/reviewers';
import {
  buildCalculatedStudyContext,
  buildStudyAnalytics,
  type CalculatedStudyContext,
  type StudyAnalytics,
  type SubjectAnalytics,
} from '@/lib/studyAnalytics';

type ProgressAnalyticsPageProps = {
  onBack?: () => void;
  onOpenHome?: () => void;
  onOpenReviewers?: () => void;
  onOpenCreate?: () => void;
  onOpenAIChat?: () => void;
};

export function ProgressAnalyticsPage({
  onBack: _onBack,
  onOpenHome: _onOpenHome,
  onOpenReviewers: _onOpenReviewers,
  onOpenCreate: _onOpenCreate,
  onOpenAIChat: _onOpenAIChat,
}: ProgressAnalyticsPageProps) {
  const initialLoading = useSkeletonLoading();
  const { refreshing, refresh } = usePullToRefresh();
  const [analytics, setAnalytics] = useState<StudyAnalytics>(() => buildStudyAnalytics([]));
  const [calculatedContext, setCalculatedContext] = useState<CalculatedStudyContext>(() =>
    buildCalculatedStudyContext([])
  );
  const [databaseLoading, setDatabaseLoading] = useState(true);
  const isLoading = initialLoading || refreshing || databaseLoading;

  useEffect(() => {
    return subscribeToReviewers(
      (reviewers) => {
        const context = buildCalculatedStudyContext(reviewers);
        setAnalytics(context.analytics);
        setCalculatedContext(context);
        setDatabaseLoading(false);
      },
      () => {
        const context = buildCalculatedStudyContext([]);
        setAnalytics(context.analytics);
        setCalculatedContext(context);
        setDatabaseLoading(false);
      }
    );
  }, []);

  return (
    <SafeAreaView edges={[]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#020a68"
            colors={['#020a68']}
          />
        }
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ProgressAnalyticsSkeleton />
        ) : (
          <>
            <View style={styles.readinessCard}>
              <View style={styles.readinessTop}>
                <View>
                  <Text style={styles.cardLabel}>Exam Readiness</Text>
                  <Text style={styles.readinessValue}>{analytics.examReadiness}% Ready</Text>
                </View>
                <View style={styles.masteryBadge}>
                  <Text style={styles.masteryText}>
                    {analytics.examReadiness >= 80 ? 'Mastery Level' : 'Building Level'}
                  </Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Study Streak</Text>
                  <Text style={styles.metricValue}>{analytics.studyStreak} Days</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Hours Logged</Text>
                  <Text style={styles.metricValue}>{analytics.hoursLogged}h</Text>
                </View>
              </View>
            </View>

            <View style={styles.logicCard}>
              <View style={styles.logicHeader}>
                <View style={styles.logicIcon}>
                  <Calculator size={17} color="#00625e" />
                </View>
                <View style={styles.logicTitleBlock}>
                  <Text style={styles.logicTitle}>Calculation First</Text>
                  <Text style={styles.logicSubtitle}>AI gets focused facts, not raw guesses.</Text>
                </View>
              </View>
              <Text style={styles.logicBody}>
                {calculatedContext.focusAreas.length > 0
                  ? `TalinoQ calculated ${calculatedContext.focusAreas[0].name} as the top focus area at ${calculatedContext.focusAreas[0].score}% mastery. AI reviewer generation will target these computed gaps with ${calculatedContext.recommendedDifficulty.toLowerCase()} difficulty.`
                  : analytics.reviewerCount > 0
                    ? `TalinoQ calculated ${analytics.examReadiness}% readiness with no subject below 80%. AI will use this summary before generating drills.`
                    : 'Create reviewers first and TalinoQ will calculate weak areas before asking AI to help.'}
              </Text>
              <View style={styles.logicMetrics}>
                <LogicMetric label="Completion" value={`${calculatedContext.reviewerCompletion}%`} />
                <LogicMetric label="Focus Areas" value={`${calculatedContext.focusAreas.length}`} />
                <LogicMetric label="AI Level" value={calculatedContext.recommendedDifficulty} />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Weekly Activity</Text>
            <View style={styles.activityCard}>
              <View style={styles.dayLabels}>
                {analytics.weeklyActivity.map((day, index) => (
                  <Text key={`${day}-${index}`} style={styles.dayText}>
                    {day.label}
                  </Text>
                ))}
              </View>
              <View style={styles.heatmapRow}>
                {analytics.weeklyActivity.map((day, columnIndex) => (
                  <View key={columnIndex} style={styles.heatColumn}>
                    {[day.value * 0.55, day.value * 0.82, day.value].map((value, rowIndex) => (
                      <View
                        key={`${columnIndex}-${rowIndex}`}
                        style={[styles.heatCell, { backgroundColor: getHeatColor(value) }]}
                      />
                    ))}
                  </View>
                ))}
              </View>
              <View style={styles.legendRow}>
                <Text style={styles.averageText}>
                  Daily average: {Math.round((analytics.hoursLogged / 7) * 10) / 10}h
                </Text>
                <View style={styles.legend}>
                  <Text style={styles.legendText}>Less</Text>
                  <View style={[styles.legendCell, { backgroundColor: '#d7edf1' }]} />
                  <View style={[styles.legendCell, { backgroundColor: '#63c8d1' }]} />
                  <View style={[styles.legendCell, { backgroundColor: '#007a80' }]} />
                  <Text style={styles.legendText}>More</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Subject Mastery</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.sectionLink}>View Details</Text>
              </TouchableOpacity>
            </View>

            {analytics.subjects.length > 0 ? (
              analytics.subjects
                .slice(0, 5)
                .map((subject, index) => (
                  <SubjectRow
                    key={subject.id}
                    icon={getSubjectIcon(index)}
                    subject={subject}
                    accent={getSubjectAccent(index)}
                    iconBg={getSubjectIconBg(index)}
                  />
                ))
            ) : (
              <View style={styles.emptyProgressCard}>
                <Text style={styles.emptyProgressTitle}>No subject data yet</Text>
                <Text style={styles.emptyProgressText}>
                  Create reviewers and TalinoQ will build your subject mastery here.
                </Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Aha! Focus Areas</Text>
            <View style={styles.focusRow}>
              {(analytics.weakSubjects.length > 0
                ? analytics.weakSubjects.slice(0, 2)
                : analytics.subjects.slice(-2)
              ).map((subject, index) => (
                <FocusCard
                  key={subject.id}
                  title={subject.name}
                  label={index === 0 ? 'IMPROVEMENT NEEDED' : 'CONCEPT GAP'}
                  body={`${subject.category} has ${subject.averageMastery}% mastery across ${subject.reviewerCount} reviewer${subject.reviewerCount === 1 ? '' : 's'}. Open AI chat for a quick drill.`}
                  buttonText={index === 0 ? 'Solve Weakness' : 'Quick Review'}
                  tone={index === 0 ? 'navy' : 'teal'}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressAnalyticsSkeleton() {
  return (
    <View>
      <View style={styles.readinessCard}>
        <View style={styles.readinessTop}>
          <View>
            <LoadingSkeleton height={14} width={116} radius={7} />
            <LoadingSkeleton height={34} width={150} radius={10} style={styles.skeletonTextGap} />
          </View>
          <LoadingSkeleton height={30} width={102} radius={999} />
        </View>
        <View style={styles.skeletonMetricRow}>
          <LoadingSkeleton height={66} radius={7} style={styles.flexSkeleton} />
          <LoadingSkeleton height={66} radius={7} style={styles.flexSkeleton} />
        </View>
      </View>

      <LoadingSkeleton height={24} width="44%" radius={8} style={styles.skeletonSectionGap} />
      <LoadingSkeleton height={176} radius={10} style={styles.skeletonCardGap} />

      <View style={styles.sectionHeader}>
        <LoadingSkeleton height={24} width="46%" radius={8} />
        <LoadingSkeleton height={14} width={70} radius={7} />
      </View>

      {Array.from({ length: 3 }).map((_, index) => (
        <LoadingSkeleton key={index} height={66} radius={9} style={styles.skeletonRowGap} />
      ))}

      <LoadingSkeleton height={24} width="42%" radius={8} style={styles.skeletonSectionGap} />
      <View style={styles.focusRow}>
        <LoadingSkeleton height={190} radius={10} style={styles.flexSkeleton} />
        <LoadingSkeleton height={190} radius={10} style={styles.flexSkeleton} />
      </View>
    </View>
  );
}

function SubjectRow({
  icon,
  subject,
  accent,
  iconBg,
}: {
  icon: React.ReactNode;
  subject: SubjectAnalytics;
  accent: string;
  iconBg: string;
}) {
  return (
    <View style={styles.subjectRow}>
      <View style={[styles.subjectIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.subjectBody}>
        <View style={styles.subjectTop}>
          <Text style={styles.subjectTitle}>{subject.name}</Text>
          <Text style={[styles.subjectValue, { color: accent }]}>{subject.averageMastery}%</Text>
        </View>
        <Text style={styles.subjectMeta}>
          {subject.reviewerCount} reviewer{subject.reviewerCount === 1 ? '' : 's'} -{' '}
          {subject.itemCount} items
        </Text>
        <View style={styles.subjectTrack}>
          <View
            style={[
              styles.subjectFill,
              { backgroundColor: accent, width: `${subject.averageMastery}%` as `${number}%` },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

function LogicMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.logicMetric}>
      <Text style={styles.logicMetricLabel}>{label}</Text>
      <Text style={styles.logicMetricValue}>{value}</Text>
    </View>
  );
}

function getSubjectIcon(index: number) {
  const icons = [
    <Sigma key="sigma" size={21} color="#ffffff" />,
    <Rocket key="rocket" size={21} color="#006a6c" />,
    <Calculator key="calculator" size={21} color="#8a3929" />,
  ];

  return icons[index % icons.length];
}

function getSubjectAccent(index: number) {
  return ['#020a68', '#007f86', '#ee845e'][index % 3];
}

function getSubjectIconBg(index: number) {
  return ['#252190', '#c7f7fb', '#ffe2d4'][index % 3];
}

function FocusCard({
  title,
  label,
  body,
  buttonText,
  tone,
}: {
  title: string;
  label: string;
  body: string;
  buttonText: string;
  tone: 'navy' | 'teal';
}) {
  const isNavy = tone === 'navy';

  return (
    <View style={[styles.focusCard, isNavy ? styles.focusCardNavy : styles.focusCardTeal]}>
      <Lightbulb size={21} color={isNavy ? '#7ddfec' : '#9adce0'} style={styles.focusIcon} />
      <Text style={styles.focusLabel}>{label}</Text>
      <Text style={styles.focusTitle}>{title}</Text>
      <Text style={styles.focusBody}>{body}</Text>
      <TouchableOpacity activeOpacity={0.84} style={styles.focusButton}>
        <Text style={[styles.focusButtonText, { color: isNavy ? '#020a68' : '#006a6c' }]}>
          {buttonText}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function getHeatColor(value: number) {
  if (value > 85) return '#007a80';
  if (value > 65) return '#4ca8b2';
  if (value > 45) return '#8fc6ce';
  return '#d7edf1';
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#eef7fc',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  readinessCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#0b2440',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },
  readinessTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: '#243041',
    fontSize: 12,
    fontWeight: '800',
  },
  readinessValue: {
    color: '#020a68',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
  },
  masteryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#65dceb',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  masteryText: {
    color: '#00625e',
    fontSize: 10,
    fontWeight: '900',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  skeletonMetricRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 48,
  },
  metricBox: {
    backgroundColor: '#e5f4ff',
    borderRadius: 7,
    flex: 1,
    padding: 12,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  metricValue: {
    color: '#020a68',
    fontSize: 20,
    fontWeight: '900',
  },
  logicCard: {
    backgroundColor: '#f7fffe',
    borderColor: '#bdeeee',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  logicHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  logicIcon: {
    alignItems: 'center',
    backgroundColor: '#d9fbf7',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  logicTitleBlock: {
    flex: 1,
  },
  logicTitle: {
    color: '#005b57',
    fontSize: 14,
    fontWeight: '900',
  },
  logicSubtitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  logicBody: {
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  logicMetrics: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  logicMetric: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  logicMetricLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
  },
  logicMetricValue: {
    color: '#020a68',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  sectionTitle: {
    color: '#020a68',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 22,
  },
  sectionLink: {
    color: '#00625e',
    fontSize: 12,
    fontWeight: '900',
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginTop: 10,
    padding: 16,
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
  },
  heatmapRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  heatColumn: {
    flex: 1,
    gap: 2,
  },
  heatCell: {
    height: 26,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  averageText: {
    color: '#64748b',
    fontSize: 11,
  },
  legend: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  legendText: {
    color: '#64748b',
    fontSize: 9,
  },
  legendCell: {
    height: 11,
    width: 11,
  },
  subjectRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 9,
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
    padding: 12,
  },
  subjectIcon: {
    alignItems: 'center',
    borderRadius: 7,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  subjectBody: {
    flex: 1,
  },
  subjectTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subjectTitle: {
    color: '#172033',
    fontSize: 13,
    fontWeight: '900',
  },
  subjectMeta: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  subjectValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  subjectTrack: {
    backgroundColor: '#ddeaf0',
    borderRadius: 999,
    height: 7,
    marginTop: 10,
    overflow: 'hidden',
  },
  subjectFill: {
    height: '100%',
  },
  focusRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
  },
  emptyProgressCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe6ee',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    padding: 16,
  },
  emptyProgressTitle: {
    color: '#020a68',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyProgressText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  focusCard: {
    borderRadius: 10,
    flex: 1,
    minHeight: 190,
    padding: 16,
  },
  focusCardNavy: {
    backgroundColor: '#020a68',
  },
  focusCardTeal: {
    backgroundColor: '#006a6c',
  },
  focusIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  focusLabel: {
    color: '#9be6ef',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  focusTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 7,
  },
  focusBody: {
    color: '#d8eff2',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 14,
  },
  focusButton: {
    alignItems: 'center',
    backgroundColor: '#65dceb',
    borderRadius: 8,
    marginTop: 'auto',
    paddingVertical: 12,
  },
  focusButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },
  flexSkeleton: {
    flex: 1,
  },
  skeletonTextGap: {
    marginTop: 8,
  },
  skeletonSectionGap: {
    marginTop: 22,
  },
  skeletonCardGap: {
    marginTop: 10,
  },
  skeletonRowGap: {
    marginTop: 10,
  },
});
