import React, { useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bot,
  Box,
  Code2,
  FileText,
  Folder,
  Landmark,
  MoreVertical,
  Plus,
  Search,
} from 'lucide-react-native';

import { LoadingSkeleton } from '@/components/app/LoadingSkeleton';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSkeletonLoading } from '@/hooks/useSkeletonLoading';
import { subscribeToReviewers, type ReviewerRecord } from '@/lib/reviewers';

type ReviewersPageProps = {
  onBack?: () => void;
  onCreateReviewer?: () => void;
  onOpenHome?: () => void;
  onOpenCreate?: () => void;
  onOpenProgress?: () => void;
  onOpenAIChat?: () => void;
};

const filters = ['All Reviewers', 'Recent', 'With Materials', 'Exported'];

export function ReviewersPage({ onCreateReviewer, onOpenCreate }: ReviewersPageProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(filters[0]);
  const [reviewers, setReviewers] = useState<ReviewerRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [databaseLoading, setDatabaseLoading] = useState(true);
  const initialLoading = useSkeletonLoading();
  const { refreshing, refresh } = usePullToRefresh();
  const isLoading = databaseLoading || initialLoading || refreshing;
  const openCreate = onOpenCreate ?? onCreateReviewer;

  useEffect(() => {
    return subscribeToReviewers(
      (nextReviewers) => {
        setReviewers(nextReviewers);
        setDatabaseLoading(false);
        setLoadError(null);
      },
      (message) => {
        setLoadError(message);
        setDatabaseLoading(false);
      }
    );
  }, []);

  const filteredReviewers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return reviewers.filter((reviewer) => {
      const matchesQuery =
        !normalizedQuery ||
        reviewer.title.toLowerCase().includes(normalizedQuery) ||
        reviewer.subject.toLowerCase().includes(normalizedQuery) ||
        reviewer.category.toLowerCase().includes(normalizedQuery);

      if (!matchesQuery) {
        return false;
      }

      if (activeFilter === 'With Materials') {
        return reviewer.sourceMaterialIds.length > 0;
      }

      if (activeFilter === 'Exported') {
        return reviewer.status === 'Exported';
      }

      return true;
    });
  }, [activeFilter, query, reviewers]);

  return (
    <SafeAreaView edges={[]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#004f4c"
            colors={['#004f4c']}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Library Folders</Text>
            <Text style={styles.subtitle}>{reviewers.length} saved reviewer(s)</Text>
          </View>

          <TouchableOpacity activeOpacity={0.84} onPress={openCreate} style={styles.createButton}>
            <Plus size={19} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Search size={15} color="#94a3b8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your library..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              activeOpacity={0.84}
              onPress={() => setActiveFilter(filter)}
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}>
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loadError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to load reviewers</Text>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <ReviewersSkeleton />
        ) : (
          <View style={styles.folderList}>
            {filteredReviewers.length > 0 ? (
              filteredReviewers.map((reviewer) => (
                <ReviewerCard key={reviewer.id} reviewer={reviewer} />
              ))
            ) : (
              <EmptyLibrary onCreate={openCreate} hasQuery={query.trim().length > 0} />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReviewersSkeleton() {
  return (
    <View style={styles.folderList}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.folderSkeletonCard}>
          <View style={styles.cardTop}>
            <LoadingSkeleton height={36} width={36} radius={5} />
            <LoadingSkeleton height={18} width={18} radius={9} />
          </View>
          <LoadingSkeleton height={15} width="46%" radius={7} style={styles.skeletonTitleGap} />
          <LoadingSkeleton height={11} width="66%" radius={6} style={styles.skeletonTextGap} />
          <LoadingSkeleton height={6} radius={999} style={styles.skeletonProgressGap} />
          <LoadingSkeleton height={10} width="28%" radius={5} style={styles.skeletonStatus} />
        </View>
      ))}
    </View>
  );
}

function EmptyLibrary({ hasQuery, onCreate }: { hasQuery: boolean; onCreate?: () => void }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <FileText size={22} color="#004f4c" />
      </View>
      <Text style={styles.emptyTitle}>
        {hasQuery ? 'No matching reviewers' : 'No reviewers yet'}
      </Text>
      <Text style={styles.emptyText}>
        {hasQuery
          ? 'Try another search or clear the current filter.'
          : 'Create a reviewer and it will stay synced here across app restarts.'}
      </Text>
      {!hasQuery ? (
        <TouchableOpacity activeOpacity={0.84} onPress={onCreate} style={styles.emptyButton}>
          <Plus size={15} color="#ffffff" />
          <Text style={styles.emptyButtonText}>Create Reviewer</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ReviewerCard({ reviewer }: { reviewer: ReviewerRecord }) {
  const accent = getReviewerAccent(reviewer);
  const progress = Math.min(100, Math.max(0, reviewer.masteryScore));

  return (
    <TouchableOpacity activeOpacity={0.88} style={[styles.folderCard, { borderLeftColor: accent }]}>
      <View style={styles.cardTop}>
        <View style={[styles.folderIcon, { backgroundColor: `${accent}14` }]}>
          {getReviewerIcon(reviewer, accent)}
        </View>
        <MoreVertical size={17} color="#6b7f91" />
      </View>

      <Text style={styles.folderTitle}>{reviewer.title}</Text>
      <Text style={styles.folderSubtitle}>
        {reviewer.estimatedItems} items • {reviewer.category} • {formatUpdatedAt(reviewer)}
      </Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaPill}>{reviewer.subject}</Text>
        <Text style={styles.metaPill}>{reviewer.difficulty}</Text>
        {reviewer.sourceMaterialIds.length > 0 ? (
          <Text style={styles.metaPill}>{reviewer.sourceMaterialIds.length} source(s)</Text>
        ) : null}
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%` as `${number}%`, backgroundColor: accent },
            ]}
          />
        </View>
        <Text style={[styles.statusText, { color: accent }]}>
          {reviewer.status === 'Exported' ? 'Exported' : `${progress}% Mastered`}
        </Text>
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

  if (reviewer.difficulty === 'Easy') {
    return '#00a56a';
  }

  return '#004f4c';
}

function getReviewerIcon(reviewer: ReviewerRecord, accent: string) {
  const subject = reviewer.subject.toLowerCase();

  if (subject.includes('history') || subject.includes('law')) {
    return <Landmark size={18} color={accent} />;
  }

  if (subject.includes('program') || subject.includes('python') || subject.includes('code')) {
    return <Code2 size={18} color={accent} />;
  }

  if (subject.includes('science') || subject.includes('cognitive')) {
    return <Bot size={18} color={accent} />;
  }

  if (subject.includes('chem')) {
    return <Box size={18} color={accent} />;
  }

  return <Folder size={18} color={accent} fill={accent} />;
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

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f7f9ff',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#004f4c',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: '#004f4c',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#eef5fa',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: '#172033',
    flex: 1,
    fontSize: 12,
    height: 42,
  },
  filterRow: {
    gap: 8,
    paddingTop: 15,
  },
  filterChip: {
    backgroundColor: '#f1f6fb',
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  filterChipActive: {
    backgroundColor: '#004f4c',
  },
  filterText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  errorTitle: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '900',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  folderList: {
    gap: 14,
    marginTop: 16,
  },
  folderCard: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderRadius: 5,
    minHeight: 132,
    overflow: 'hidden',
    padding: 16,
    shadowColor: '#0b2440',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
  },
  folderSkeletonCard: {
    backgroundColor: '#ffffff',
    borderLeftColor: '#dbe6ee',
    borderLeftWidth: 4,
    borderRadius: 5,
    minHeight: 118,
    padding: 16,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  folderIcon: {
    alignItems: 'center',
    borderRadius: 5,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  folderTitle: {
    color: '#003a70',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 16,
  },
  folderSubtitle: {
    color: '#607388',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },
  metaPill: {
    backgroundColor: '#eefafa',
    borderRadius: 999,
    color: '#004f4c',
    fontSize: 9,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  progressWrap: {
    alignItems: 'flex-end',
    marginTop: 13,
  },
  progressTrack: {
    backgroundColor: '#e5eef5',
    borderRadius: 999,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    borderRadius: 999,
    height: '100%',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    marginTop: 4,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dbe6ee',
    borderRadius: 14,
    borderWidth: 1,
    padding: 22,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#eefafa',
    borderRadius: 999,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  emptyTitle: {
    color: '#004f4c',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 14,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyButton: {
    alignItems: 'center',
    backgroundColor: '#004f4c',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  skeletonTitleGap: {
    marginTop: 16,
  },
  skeletonTextGap: {
    marginTop: 6,
  },
  skeletonProgressGap: {
    marginTop: 14,
  },
  skeletonStatus: {
    alignSelf: 'flex-end',
    marginTop: 6,
  },
});
