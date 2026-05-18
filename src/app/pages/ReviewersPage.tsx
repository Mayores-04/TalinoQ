import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  BookOpen,
  Bot,
  Box,
  Brain,
  Code2,
  Folder,
  Landmark,
  MoreVertical,
  PenLine,
  Plus,
  Search,
} from 'lucide-react-native';

import { LoadingSkeleton } from '@/components/app/LoadingSkeleton';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSkeletonLoading } from '@/hooks/useSkeletonLoading';
import {
  createLibrary,
  deleteLibrary,
  subscribeToLibraries,
  updateLibrary,
  type LibraryColor,
  type LibraryRecord,
} from '@/lib/libraries';
import {
  deleteReviewer,
  subscribeToReviewers,
  updateReviewer,
  type ReviewerRecord,
  type ReviewerStatus,
} from '@/lib/reviewers';
import {
  ReviewerStudyPage,
  type ReviewerStudyMode,
} from '@/app/pages/reviewer/ReviewerStudyPage';

type ReviewersPageProps = {
  onBack?: () => void;
  onCreateReviewer?: () => void;
  onOpenHome?: () => void;
  onOpenCreate?: () => void;
  onOpenProgress?: () => void;
  onOpenAIChat?: () => void;
  onStudyModeChange?: (open: boolean) => void;
};

type LibrarySection = {
  library: LibraryRecord;
  reviewers: ReviewerRecord[];
  reviewerCount: number;
  materialCount: number;
};

const filters = ['All', 'Libraries', 'Recent', 'With Materials', 'Exported'];
const libraryColors: LibraryColor[] = ['#004f4c', '#007a80', '#020a68', '#7c3aed', '#ee845e'];

export function ReviewersPage({
  onCreateReviewer,
  onOpenCreate,
  onStudyModeChange,
}: ReviewersPageProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(filters[0]);
  const [libraries, setLibraries] = useState<LibraryRecord[]>([]);
  const [reviewers, setReviewers] = useState<ReviewerRecord[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<ReviewerRecord | null>(null);
  const [studyReviewer, setStudyReviewer] = useState<ReviewerRecord | null>(null);
  const [studyMode, setStudyMode] = useState<ReviewerStudyMode>('quiz');
  const [selectedLibrary, setSelectedLibrary] = useState<LibraryRecord | null>(null);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewersLoading, setReviewersLoading] = useState(true);
  const [librariesLoading, setLibrariesLoading] = useState(true);
  const initialLoading = useSkeletonLoading();
  const { refreshing, refresh } = usePullToRefresh();
  const isLoading = reviewersLoading || librariesLoading || initialLoading || refreshing;
  const openCreate = onOpenCreate ?? onCreateReviewer;

  const openStudy = (reviewer: ReviewerRecord, mode: ReviewerStudyMode) => {
    setSelectedReviewer(null);
    setStudyReviewer(reviewer);
    setStudyMode(mode);
    onStudyModeChange?.(true);
  };

  useEffect(() => {
    return subscribeToReviewers(
      (nextReviewers) => {
        setReviewers(nextReviewers);
        setReviewersLoading(false);
        setLoadError(null);
      },
      (message) => {
        setLoadError(message);
        setReviewersLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    return subscribeToLibraries(
      (nextLibraries) => {
        setLibraries(nextLibraries);
        setLibrariesLoading(false);
        setLoadError(null);
      },
      (message) => {
        setLoadError(message);
        setLibrariesLoading(false);
      }
    );
  }, []);

  const { sections, unfiledReviewers } = useMemo(
    () => buildLibrarySections({ activeFilter, libraries, query, reviewers }),
    [activeFilter, libraries, query, reviewers]
  );

  const visibleLibraryCount = sections.length;
  const visibleReviewerCount =
    sections.reduce((total, section) => total + section.reviewers.length, 0) +
    unfiledReviewers.length;

  if (studyReviewer) {
    return (
      <ReviewerStudyPage
        initialMode={studyMode}
        reviewer={studyReviewer}
        onBack={() => {
          setStudyReviewer(null);
          onStudyModeChange?.(false);
        }}
      />
    );
  }

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
            <Text style={styles.title}>Reviewers</Text>
            <Text style={styles.subtitle}>
              {libraries.length} librar{libraries.length === 1 ? 'y' : 'ies'} - {reviewers.length}{' '}
              reviewer{reviewers.length === 1 ? '' : 's'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => {
                setSelectedLibrary(null);
                setLibraryModalOpen(true);
              }}
              style={styles.libraryButton}>
              <Folder size={17} color="#004f4c" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.84} onPress={openCreate} style={styles.createButton}>
              <Plus size={19} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Search size={15} color="#94a3b8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search libraries, subjects, reviewers..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.quickCreateCard}>
          <View style={styles.quickCreateCopy}>
            <Text style={styles.quickCreateTitle}>Organize first, review later</Text>
            <Text style={styles.quickCreateText}>
              Create a library or subject folder before adding reviewers, scans, PDFs, or notes.
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => {
              setSelectedLibrary(null);
              setLibraryModalOpen(true);
            }}
            style={styles.quickCreateButton}>
            <Plus size={15} color="#ffffff" />
            <Text style={styles.quickCreateButtonText}>New Library</Text>
          </TouchableOpacity>
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
            <Text style={styles.errorTitle}>Unable to load library</Text>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <ReviewersSkeleton />
        ) : (
          <View style={styles.folderList}>
            {visibleLibraryCount > 0 || visibleReviewerCount > 0 ? (
              <>
                {sections.map((section) => (
                  <LibrarySectionCard
                    key={section.library.id}
                    onCreateReviewer={openCreate}
                    onEditLibrary={() => {
                      setSelectedLibrary(section.library);
                      setLibraryModalOpen(true);
                    }}
                    onOpenReviewer={setSelectedReviewer}
                    section={section}
                  />
                ))}

                {unfiledReviewers.length > 0 ? (
                  <View style={styles.unfiledSection}>
                    <Text style={styles.unfiledTitle}>Unfiled Reviewers</Text>
                    {unfiledReviewers.map((reviewer) => (
                      <ReviewerCard
                        key={reviewer.id}
                        reviewer={reviewer}
                        onPress={() => setSelectedReviewer(reviewer)}
                      />
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <EmptyLibrary
                hasQuery={query.trim().length > 0}
                onCreateLibrary={() => {
                  setSelectedLibrary(null);
                  setLibraryModalOpen(true);
                }}
                onCreateReviewer={openCreate}
              />
            )}
          </View>
        )}
      </ScrollView>

      <LibraryModal
        library={selectedLibrary}
        onClose={() => {
          setLibraryModalOpen(false);
          setSelectedLibrary(null);
        }}
        visible={libraryModalOpen}
      />

      <ReviewerManagerModal
        libraries={libraries}
        reviewer={selectedReviewer}
        onClose={() => setSelectedReviewer(null)}
        onDeleted={() => setSelectedReviewer(null)}
        onOpenStudy={openStudy}
        onUpdated={setSelectedReviewer}
      />
    </SafeAreaView>
  );
}

function buildLibrarySections({
  activeFilter,
  libraries,
  query,
  reviewers,
}: {
  activeFilter: string;
  libraries: LibraryRecord[];
  query: string;
  reviewers: ReviewerRecord[];
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const filterReviewer = (reviewer: ReviewerRecord) => {
    const matchesQuery =
      !normalizedQuery ||
      reviewer.title.toLowerCase().includes(normalizedQuery) ||
      reviewer.subject.toLowerCase().includes(normalizedQuery) ||
      reviewer.category.toLowerCase().includes(normalizedQuery) ||
      reviewer.libraryName?.toLowerCase().includes(normalizedQuery);

    if (!matchesQuery) {
      return false;
    }

    if (activeFilter === 'With Materials') {
      return reviewer.sourceMaterialIds.length > 0;
    }

    if (activeFilter === 'Exported') {
      return reviewer.status === 'Exported';
    }

    if (activeFilter === 'Recent') {
      return isRecentReviewer(reviewer);
    }

    return true;
  };

  const sections = libraries
    .map((library) => {
      const libraryReviewers = reviewers.filter((reviewer) => reviewer.libraryId === library.id);
      const filteredReviewers = libraryReviewers.filter(filterReviewer);
      const materialCount = libraryReviewers.reduce(
        (total, reviewer) => total + reviewer.sourceMaterialIds.length,
        0
      );
      const libraryMatchesQuery =
        Boolean(normalizedQuery) &&
        (library.name.toLowerCase().includes(normalizedQuery) ||
          library.description.toLowerCase().includes(normalizedQuery));
      const shouldShowLibrary =
        activeFilter === 'Libraries' ||
        filteredReviewers.length > 0 ||
        libraryMatchesQuery ||
        (!normalizedQuery && activeFilter === 'All');

      return {
        library,
        reviewers: activeFilter === 'Libraries' ? [] : filteredReviewers,
        reviewerCount: libraryReviewers.length,
        materialCount,
        shouldShowLibrary,
      };
    })
    .filter((section) => section.shouldShowLibrary)
    .map(({ shouldShowLibrary: _shouldShowLibrary, ...section }) => section);

  const knownLibraryIds = new Set(libraries.map((library) => library.id));
  const unfiledReviewers =
    activeFilter === 'Libraries'
      ? []
      : reviewers.filter(
          (reviewer) =>
            (!reviewer.libraryId || !knownLibraryIds.has(reviewer.libraryId)) &&
            filterReviewer(reviewer)
        );

  return { sections, unfiledReviewers };
}

function isRecentReviewer(reviewer: ReviewerRecord) {
  const value = reviewer.updatedAt ?? reviewer.createdAt;

  if (!value) {
    return false;
  }

  const savedAt = new Date(value).getTime();
  if (Number.isNaN(savedAt)) {
    return false;
  }

  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  return Date.now() - savedAt <= fourteenDays;
}

function ReviewersSkeleton() {
  return (
    <View style={styles.folderList}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.folderSkeletonCard}>
          <View style={styles.cardTop}>
            <LoadingSkeleton height={40} width={40} radius={8} />
            <LoadingSkeleton height={18} width={56} radius={9} />
          </View>
          <LoadingSkeleton height={17} width="56%" radius={7} style={styles.skeletonTitleGap} />
          <LoadingSkeleton height={11} width="76%" radius={6} style={styles.skeletonTextGap} />
          <LoadingSkeleton height={86} radius={10} style={styles.skeletonCardGap} />
        </View>
      ))}
    </View>
  );
}

function EmptyLibrary({
  hasQuery,
  onCreateLibrary,
  onCreateReviewer,
}: {
  hasQuery: boolean;
  onCreateLibrary: () => void;
  onCreateReviewer?: () => void;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Folder size={23} color="#004f4c" />
      </View>
      <Text style={styles.emptyTitle}>
        {hasQuery ? 'No matching folders' : 'Organize your study materials first'}
      </Text>
      <Text style={styles.emptyText}>
        {hasQuery
          ? 'Try another search or clear the current filter.'
          : 'Create a Library or Subject now, then add reviewers and learning materials later.'}
      </Text>
      {!hasQuery ? (
        <View style={styles.emptyActions}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={onCreateLibrary}
            style={styles.emptyButton}>
            <Plus size={15} color="#ffffff" />
            <Text style={styles.emptyButtonText}>Create Library</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={onCreateReviewer}
            style={styles.emptySecondaryButton}>
            <Text style={styles.emptySecondaryButtonText}>Create Reviewer</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function LibrarySectionCard({
  onCreateReviewer,
  onEditLibrary,
  onOpenReviewer,
  section,
}: {
  onCreateReviewer?: () => void;
  onEditLibrary: () => void;
  onOpenReviewer: (reviewer: ReviewerRecord) => void;
  section: LibrarySection;
}) {
  return (
    <View style={[styles.librarySection, { borderLeftColor: section.library.color }]}>
      <View style={styles.libraryTop}>
        <View style={[styles.libraryIcon, { backgroundColor: `${section.library.color}18` }]}>
          <Folder size={20} color={section.library.color} fill={section.library.color} />
        </View>
        <TouchableOpacity
          activeOpacity={0.76}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${section.library.name}`}
          onPress={onEditLibrary}
          style={styles.moreButton}>
          <MoreVertical size={18} color="#6b7f91" />
        </TouchableOpacity>
      </View>

      <Text style={styles.libraryTitle}>{section.library.name}</Text>
      {section.library.description ? (
        <Text style={styles.libraryDescription}>{section.library.description}</Text>
      ) : (
        <Text style={styles.libraryDescription}>Ready for reviewers, PDFs, scans, and notes.</Text>
      )}

      <View style={styles.libraryMetaRow}>
        <Text style={styles.metaPill}>
          {section.reviewerCount} reviewer{section.reviewerCount === 1 ? '' : 's'}
        </Text>
        <Text style={styles.metaPill}>
          {section.materialCount} material{section.materialCount === 1 ? '' : 's'}
        </Text>
      </View>

      {section.reviewers.length > 0 ? (
        <View style={styles.nestedReviewers}>
          {section.reviewers.map((reviewer) => (
            <ReviewerCard
              compact
              key={reviewer.id}
              reviewer={reviewer}
              onPress={() => onOpenReviewer(reviewer)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyFolderInline}>
          <Text style={styles.emptyFolderTitle}>Empty library</Text>
          <Text style={styles.emptyFolderText}>Add a reviewer later and choose this folder.</Text>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={onCreateReviewer}
            style={styles.emptyFolderButton}>
            <Text style={styles.emptyFolderButtonText}>Add Reviewer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ReviewerCard({
  compact,
  reviewer,
  onPress,
}: {
  compact?: boolean;
  reviewer: ReviewerRecord;
  onPress: () => void;
}) {
  const accent = getReviewerAccent(reviewer);
  const progress = Math.min(100, Math.max(0, reviewer.masteryScore));

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.folderCard, compact && styles.folderCardCompact, { borderLeftColor: accent }]}>
      <View style={styles.cardTop}>
        <View style={[styles.folderIcon, { backgroundColor: `${accent}14` }]}>
          {getReviewerIcon(reviewer, accent)}
        </View>
        <MoreVertical size={17} color="#6b7f91" />
      </View>

      <Text style={styles.folderTitle}>{reviewer.title}</Text>
      <Text style={styles.folderSubtitle}>
        {reviewer.estimatedItems} items - {reviewer.category} - {formatUpdatedAt(reviewer)}
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

function LibraryModal({
  library,
  onClose,
  visible,
}: {
  library: LibraryRecord | null;
  onClose: () => void;
  visible: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<LibraryColor>('#004f4c');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(library?.name ?? '');
    setDescription(library?.description ?? '');
    setColor(library?.color ?? '#004f4c');
    setErrorMessage(null);
  }, [library, visible]);

  const saveLibrary = async () => {
    setBusy(true);
    setErrorMessage(null);

    try {
      if (library) {
        await updateLibrary(library.id, { color, description, name });
        Alert.alert('Library updated', `${name.trim()} was saved.`);
      } else {
        await createLibrary({ color, description, name });
        Alert.alert('Library created', `${name.trim()} is ready for reviewers.`);
      }

      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again in a moment.';
      setErrorMessage(message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!library) {
      return;
    }

    Alert.alert(
      'Delete library?',
      `${library.name} can only be deleted when it has no reviewers.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setErrorMessage(null);
            try {
              await deleteLibrary(library.id);
              onClose();
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : 'Delete failed.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalScrim}>
        <View style={styles.managerSheet}>
          <View style={styles.managerHeader}>
            <View>
              <Text style={styles.managerEyebrow}>{library ? 'Edit Library' : 'New Library'}</Text>
              <Text style={styles.managerTitle}>
                {library ? library.name : 'Create a Subject Folder'}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={styles.managerClose}>
              <Text style={styles.managerCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.managerLabel}>Library / Subject Name</Text>
          <TextInput
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
            placeholder="e.g., Quantum Mechanics"
            placeholderTextColor="#94a3b8"
            style={styles.managerInput}
          />

          <Text style={styles.managerLabel}>Description</Text>
          <TextInput
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Optional notes about this library"
            placeholderTextColor="#94a3b8"
            style={[styles.managerInput, styles.managerTextArea]}
          />

          <Text style={styles.managerLabel}>Color</Text>
          <View style={styles.colorRow}>
            {libraryColors.map((item) => (
              <TouchableOpacity
                key={item}
                activeOpacity={0.78}
                onPress={() => setColor(item)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: item },
                  color === item && styles.colorSwatchActive,
                ]}
              />
            ))}
          </View>

          {errorMessage ? <Text style={styles.modalErrorText}>{errorMessage}</Text> : null}

          <View style={styles.managerActions}>
            {library ? (
              <TouchableOpacity
                activeOpacity={0.82}
                disabled={busy}
                onPress={confirmDelete}
                style={[styles.managerDeleteButton, busy && styles.managerButtonDisabled]}>
                <Text style={styles.managerDeleteText}>Delete</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={busy}
              onPress={saveLibrary}
              style={[styles.managerSaveButton, busy && styles.managerButtonDisabled]}>
              {busy ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.managerSaveText}>{library ? 'Save Changes' : 'Create'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ReviewerManagerModal({
  libraries,
  reviewer,
  onClose,
  onDeleted,
  onOpenStudy,
  onUpdated,
}: {
  libraries: LibraryRecord[];
  reviewer: ReviewerRecord | null;
  onClose: () => void;
  onDeleted: () => void;
  onOpenStudy: (reviewer: ReviewerRecord, mode: ReviewerStudyMode) => void;
  onUpdated: (reviewer: ReviewerRecord) => void;
}) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [status, setStatus] = useState<ReviewerStatus>('Ready');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!reviewer) {
      return;
    }

    setTitle(reviewer.title);
    setSubject(reviewer.subject);
    setCategory(reviewer.category);
    setSelectedLibraryId(reviewer.libraryId ?? null);
    setStatus(reviewer.status);
  }, [reviewer]);

  if (!reviewer) {
    return null;
  }

  const selectedLibrary = libraries.find((library) => library.id === selectedLibraryId) ?? null;

  const saveChanges = async () => {
    setBusy(true);
    try {
      const updated = await updateReviewer(reviewer.id, {
        title,
        subject,
        category: selectedLibrary?.name ?? category,
        difficulty: reviewer.difficulty,
        questionCounts: reviewer.questionCounts,
        libraryId: selectedLibrary?.id ?? null,
        libraryName: selectedLibrary?.name ?? null,
        sourceMaterialIds: reviewer.sourceMaterialIds,
        generatedQuestions: reviewer.generatedQuestions,
        exportSettings: reviewer.exportSettings,
        status,
      });
      onUpdated(updated);
      Alert.alert('Reviewer updated', `${updated.title} was saved.`);
    } catch (error) {
      Alert.alert(
        'Update failed',
        error instanceof Error ? error.message : 'Please try again in a moment.'
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete reviewer?', `${reviewer.title} will be removed from your library.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteReviewer(reviewer.id);
            onDeleted();
          } catch (error) {
            Alert.alert(
              'Delete failed',
              error instanceof Error ? error.message : 'Please try again in a moment.'
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal animationType="slide" transparent visible={Boolean(reviewer)} onRequestClose={onClose}>
      <View style={styles.modalScrim}>
        <View style={styles.managerSheet}>
          <View style={styles.managerHeader}>
            <View>
              <Text style={styles.managerEyebrow}>Reviewer Details</Text>
              <Text style={styles.managerTitle}>{reviewer.title}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={styles.managerClose}>
              <Text style={styles.managerCloseText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.studyActionGrid}>
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => onOpenStudy(reviewer, 'quiz')}
                style={styles.studyPrimaryAction}>
                <Brain size={17} color="#ffffff" />
                <Text style={styles.studyPrimaryText}>Start Quiz</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => onOpenStudy(reviewer, 'flashcards')}
                style={styles.studySecondaryAction}>
                <BookOpen size={17} color="#004f4c" />
                <Text style={styles.studySecondaryText}>Study Flashcards</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => onOpenStudy(reviewer, 'typed')}
                style={styles.studySecondaryAction}>
                <PenLine size={17} color="#004f4c" />
                <Text style={styles.studySecondaryText}>Answer Practice</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.managerLabel}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.managerInput} />

            <Text style={styles.managerLabel}>Library / Subject Folder</Text>
            <View style={styles.libraryPickerRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedLibraryId(null)}
                style={[
                  styles.libraryPickerChip,
                  !selectedLibraryId && styles.libraryPickerChipActive,
                ]}>
                <Text
                  style={[
                    styles.libraryPickerText,
                    !selectedLibraryId && styles.libraryPickerTextActive,
                  ]}>
                  Unfiled
                </Text>
              </TouchableOpacity>
              {libraries.map((library) => (
                <TouchableOpacity
                  key={library.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedLibraryId(library.id);
                    setCategory(library.name);
                  }}
                  style={[
                    styles.libraryPickerChip,
                    selectedLibraryId === library.id && styles.libraryPickerChipActive,
                  ]}>
                  <Text
                    style={[
                      styles.libraryPickerText,
                      selectedLibraryId === library.id && styles.libraryPickerTextActive,
                    ]}>
                    {library.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.managerLabel}>Subject</Text>
            <TextInput value={subject} onChangeText={setSubject} style={styles.managerInput} />

            <Text style={styles.managerLabel}>Category</Text>
            <TextInput value={category} onChangeText={setCategory} style={styles.managerInput} />

            <View style={styles.managerStatsRow}>
              <View style={styles.managerStat}>
                <Text style={styles.managerStatLabel}>Items</Text>
                <Text style={styles.managerStatValue}>{reviewer.estimatedItems}</Text>
              </View>
              <View style={styles.managerStat}>
                <Text style={styles.managerStatLabel}>Questions</Text>
                <Text style={styles.managerStatValue}>{reviewer.generatedQuestions.length}</Text>
              </View>
              <View style={styles.managerStat}>
                <Text style={styles.managerStatLabel}>Sources</Text>
                <Text style={styles.managerStatValue}>{reviewer.sourceMaterialIds.length}</Text>
              </View>
            </View>

            <View style={styles.statusSwitchRow}>
              {(['Ready', 'Exported'] as ReviewerStatus[]).map((item) => (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.84}
                  onPress={() => setStatus(item)}
                  style={[styles.statusSwitch, status === item && styles.statusSwitchActive]}>
                  <Text
                    style={[
                      styles.statusSwitchText,
                      status === item && styles.statusSwitchTextActive,
                    ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.managerQuestionPreview}>
              <Text style={styles.managerQuestionTitle}>Saved AI Questions</Text>
              {reviewer.generatedQuestions.slice(0, 3).map((question, index) => (
                <Text key={question.id} style={styles.managerQuestionText}>
                  {index + 1}. {question.prompt}
                </Text>
              ))}
            </View>
          </ScrollView>

          <View style={styles.managerActions}>
            <TouchableOpacity
              activeOpacity={0.82}
              disabled={busy}
              onPress={confirmDelete}
              style={[styles.managerDeleteButton, busy && styles.managerButtonDisabled]}>
              <Text style={styles.managerDeleteText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={busy}
              onPress={saveChanges}
              style={[styles.managerSaveButton, busy && styles.managerButtonDisabled]}>
              {busy ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.managerSaveText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  headerActions: {
    flexDirection: 'row',
    gap: 9,
  },
  libraryButton: {
    alignItems: 'center',
    backgroundColor: '#eefafa',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
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
  quickCreateCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dbe6ee',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    padding: 14,
  },
  quickCreateCopy: {
    flex: 1,
  },
  quickCreateTitle: {
    color: '#004f4c',
    fontSize: 13,
    fontWeight: '900',
  },
  quickCreateText: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  quickCreateButton: {
    alignItems: 'center',
    backgroundColor: '#004f4c',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  quickCreateButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
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
  librarySection: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderRadius: 8,
    overflow: 'hidden',
    padding: 16,
    shadowColor: '#0b2440',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
  },
  libraryTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  libraryIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  moreButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  libraryTitle: {
    color: '#003a70',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 14,
  },
  libraryDescription: {
    color: '#607388',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 4,
  },
  libraryMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },
  nestedReviewers: {
    gap: 10,
    marginTop: 12,
  },
  unfiledSection: {
    gap: 10,
  },
  unfiledTitle: {
    color: '#004f4c',
    fontSize: 15,
    fontWeight: '900',
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
  folderCardCompact: {
    backgroundColor: '#f8fbfd',
    minHeight: 118,
    shadowOpacity: 0,
  },
  folderSkeletonCard: {
    backgroundColor: '#ffffff',
    borderLeftColor: '#dbe6ee',
    borderLeftWidth: 4,
    borderRadius: 8,
    minHeight: 170,
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
  emptyFolderInline: {
    backgroundColor: '#f7fbff',
    borderColor: '#dbe6ee',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  emptyFolderTitle: {
    color: '#004f4c',
    fontSize: 12,
    fontWeight: '900',
  },
  emptyFolderText: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  emptyFolderButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#eefafa',
    borderRadius: 999,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyFolderButtonText: {
    color: '#004f4c',
    fontSize: 10,
    fontWeight: '900',
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
    textAlign: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 16,
  },
  emptyButton: {
    alignItems: 'center',
    backgroundColor: '#004f4c',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  emptySecondaryButton: {
    alignItems: 'center',
    backgroundColor: '#eefafa',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptySecondaryButtonText: {
    color: '#004f4c',
    fontSize: 12,
    fontWeight: '900',
  },
  skeletonTitleGap: {
    marginTop: 16,
  },
  skeletonTextGap: {
    marginTop: 6,
  },
  skeletonCardGap: {
    marginTop: 14,
  },
  modalScrim: {
    backgroundColor: 'rgba(0, 31, 54, 0.36)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  managerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '86%',
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  managerHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  managerEyebrow: {
    color: '#007a80',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  managerTitle: {
    color: '#003a70',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  managerClose: {
    backgroundColor: '#eef5fa',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  managerCloseText: {
    color: '#004f4c',
    fontSize: 11,
    fontWeight: '900',
  },
  managerLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 7,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  managerInput: {
    backgroundColor: '#f7fbff',
    borderColor: '#dbe6ee',
    borderRadius: 10,
    borderWidth: 1,
    color: '#172033',
    fontSize: 13,
    fontWeight: '800',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  managerTextArea: {
    minHeight: 78,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorSwatch: {
    borderColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 3,
    height: 34,
    width: 34,
  },
  colorSwatchActive: {
    borderColor: '#0f172a',
  },
  libraryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  libraryPickerChip: {
    backgroundColor: '#f1f6fb',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  libraryPickerChipActive: {
    backgroundColor: '#004f4c',
  },
  libraryPickerText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
  },
  libraryPickerTextActive: {
    color: '#ffffff',
  },
  modalErrorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
  },
  studyActionGrid: {
    gap: 10,
    marginBottom: 6,
  },
  studyPrimaryAction: {
    alignItems: 'center',
    backgroundColor: '#004f4c',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  studyPrimaryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  studySecondaryAction: {
    alignItems: 'center',
    backgroundColor: '#e9fbf8',
    borderColor: '#c6f0ea',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
  },
  studySecondaryText: {
    color: '#004f4c',
    fontSize: 12,
    fontWeight: '900',
  },
  managerStatsRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
  },
  managerStat: {
    backgroundColor: '#eefafa',
    borderRadius: 10,
    flex: 1,
    padding: 12,
  },
  managerStatLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  managerStatValue: {
    color: '#004f4c',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 4,
  },
  statusSwitchRow: {
    backgroundColor: '#eef5fa',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    padding: 5,
  },
  statusSwitch: {
    alignItems: 'center',
    borderRadius: 9,
    flex: 1,
    paddingVertical: 10,
  },
  statusSwitchActive: {
    backgroundColor: '#004f4c',
  },
  statusSwitchText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
  },
  statusSwitchTextActive: {
    color: '#ffffff',
  },
  managerQuestionPreview: {
    backgroundColor: '#f7fbff',
    borderColor: '#dbe6ee',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  managerQuestionTitle: {
    color: '#004f4c',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
  },
  managerQuestionText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 5,
  },
  managerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  managerDeleteButton: {
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderRadius: 12,
    flex: 0.78,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  managerDeleteText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '900',
  },
  managerSaveButton: {
    alignItems: 'center',
    backgroundColor: '#004f4c',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingVertical: 13,
  },
  managerSaveText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  managerButtonDisabled: {
    opacity: 0.62,
  },
});
