import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowDownToLine,
  ArrowLeft,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  Library,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react-native';
import SetupScreen from './reviewer/SetupScreen';
import ExtractionScreen from './reviewer/ExtractionScreen';
import LearningMaterialsScreen from './reviewer/LearningMaterialsScreen';
import { subscribeToLibraries, type LibraryRecord } from '@/lib/libraries';
import { fetchLearningMaterialsByIds, type MaterialPreview } from '@/lib/learningMaterials';
import {
  createReviewer,
  subscribeToReviewers,
  updateReviewer,
  updateReviewerStatus,
  validateReviewerDraft,
  type ReviewerDifficulty,
  type ReviewerExportFormat,
  type ReviewerQuestion,
  type ReviewerRecord,
  type ReviewerStatus,
} from '@/lib/reviewers';
import { generateReviewerQuestionsWithAi } from '@/lib/reviewerAi';
import { ReviewerStudyPage, type ReviewerStudyMode } from '@/app/pages/reviewer/ReviewerStudyPage';
import {
  buildCalculatedStudyContext,
  getCategorySuggestions,
  getSubjectSuggestions,
} from '@/lib/studyAnalytics';
import {
  APP_FLOW_BOTTOM_PADDING,
  APP_PAGE_BACKGROUND,
  APP_PAGE_HORIZONTAL_PADDING,
} from '@/styles/appTheme';

type CreateReviewerFlowProps = {
  onBack: () => void;
  onOpenHome: () => void;
  onOpenReviewers: () => void;
  onOpenProgress: () => void;
  onOpenAIChat: () => void;
};

type FlowStep = 'setup' | 'materials' | 'extracting' | 'questions' | 'export' | 'detail';
type Difficulty = ReviewerDifficulty;
type ExportFormat = ReviewerExportFormat;

type ExtractionSummary = {
  characterCount: number;
  detectedSubject: string;
  detectedTopics: string[];
  materialCount: number;
  materials: MaterialPreview[];
  previewText: string;
  readableCount: number;
  sourceText: string;
  warnings: string[];
};

type QuestionConfig = {
  id: string;
  title: string;
  subtitle: string;
  count: number;
};

const initialQuestions: QuestionConfig[] = [
  {
    id: 'multiple-choice',
    title: 'Multiple Choice',
    subtitle: 'Standard 4-option items',
    count: 20,
  },
  {
    id: 'identification',
    title: 'Identification',
    subtitle: 'Exact term matching',
    count: 0,
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    subtitle: 'Active recall study deck',
    count: 50,
  },
];

const categories = ['Midterm Prep', 'Final Exam Prep', 'Board Exam', 'Lecture Review'];
function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Please try again in a moment.';
}

function mergeSuggestion(suggestions: string[], currentValue: string) {
  const cleanedValue = currentValue.trim();

  if (!cleanedValue || suggestions.includes(cleanedValue)) {
    return suggestions;
  }

  return [cleanedValue, ...suggestions].slice(0, 8);
}

export function CreateReviewerFlow({
  onBack,
  onOpenReviewers,
  onOpenAIChat,
  onOpenHome: _onOpenHome,
  onOpenProgress: _onOpenProgress,
}: CreateReviewerFlowProps) {
  const [step, setStep] = useState<FlowStep>('setup');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [libraries, setLibraries] = useState<LibraryRecord[]>([]);
  const [savedReviewers, setSavedReviewers] = useState<ReviewerRecord[]>([]);
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState(categories);
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [questions, setQuestions] = useState<QuestionConfig[]>(initialQuestions);
  const [format, setFormat] = useState<ExportFormat>('PDF');
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [theme, setTheme] = useState('Modern Academic');
  const [sourceMaterialIds, setSourceMaterialIds] = useState<string[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<ReviewerQuestion[]>([]);
  const [createdReviewer, setCreatedReviewer] = useState<ReviewerRecord | null>(null);
  const [studyReviewer, setStudyReviewer] = useState<ReviewerRecord | null>(null);
  const [studyMode, setStudyMode] = useState<ReviewerStudyMode>('quiz');
  const [extractionSummary, setExtractionSummary] = useState<ExtractionSummary | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const estimatedItems = useMemo(
    () => questions.reduce((total, item) => total + item.count, 0),
    [questions]
  );
  const calculatedContext = useMemo(
    () => buildCalculatedStudyContext(savedReviewers),
    [savedReviewers]
  );

  React.useEffect(() => {
    return subscribeToReviewers((reviewers) => {
      setSavedReviewers(reviewers);
      setSubjectSuggestions(getSubjectSuggestions(reviewers));
      setCategorySuggestions(getCategorySuggestions(reviewers));
    });
  }, []);

  React.useEffect(() => {
    return subscribeToLibraries(setLibraries);
  }, []);

  const selectedLibrary = libraries.find((library) => library.id === selectedLibraryId) ?? null;
  const effectiveSubject =
    subject.trim() ||
    extractionSummary?.detectedSubject ||
    selectedLibrary?.name ||
    'General Study';
  const reviewerTitle =
    title.trim() || (effectiveSubject ? `${effectiveSubject} Reviewer` : 'Smart Reviewer');
  const mastery =
    createdReviewer?.masteryScore ?? (difficulty === 'Hard' ? 76 : difficulty === 'Easy' ? 88 : 82);
  const exportSettings = useMemo(
    () => ({
      format,
      includeAnswers,
      includeExplanations,
      includeHeader,
      theme,
    }),
    [format, includeAnswers, includeExplanations, includeHeader, theme]
  );

  const buildReviewerInput = (status: ReviewerStatus = 'Ready') => ({
    title,
    subject: effectiveSubject,
    category,
    difficulty,
    questionCounts: questions,
    libraryId: selectedLibrary?.id ?? null,
    libraryName: selectedLibrary?.name ?? null,
    sourceMaterialIds,
    generatedQuestions,
    exportSettings,
    status,
  });

  const updateQuestionCount = (id: string, delta: number) => {
    setQuestions((current) =>
      current.map((item) =>
        item.id === id ? { ...item, count: Math.max(0, item.count + delta) } : item
      )
    );
  };

  const trackSavedMaterial = (materialId: string) => {
    setSourceMaterialIds((current) =>
      current.includes(materialId) ? current : [...current, materialId]
    );
  };

  const untrackSavedMaterial = (materialId: string) => {
    setSourceMaterialIds((current) => current.filter((id) => id !== materialId));
  };

  const handleGenerate = () => {
    void prepareExtraction();
  };

  const prepareExtraction = async () => {
    setStep('extracting');
    setIsExtracting(true);
    setSaveError(null);

    try {
      const summary = await buildExtractionSummary({
        currentSubject: subject,
        materialIds: sourceMaterialIds,
        selectedLibrary,
      });
      setExtractionSummary(summary);

      if (!subject.trim() && summary.detectedSubject) {
        setSubject(summary.detectedSubject);
      }

      validateReviewerDraft({
        ...buildReviewerInput(),
        subject: summary.detectedSubject || effectiveSubject,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      setSaveError(message);
      Alert.alert('Check reviewer source', message);
    } finally {
      setIsExtracting(false);
    }
  };

  const generateAiQuestions = async () => {
    setIsGenerating(true);
    setSaveError(null);
    setStep('questions');

    try {
      const aiQuestions = await generateReviewerQuestionsWithAi({
        ...buildReviewerInput(),
        title: reviewerTitle,
        estimatedItems,
        sourceContent: extractionSummary?.sourceText,
        calculatedContext,
      });
      setGeneratedQuestions(aiQuestions);
      setStep('questions');
    } catch (error) {
      const message = getErrorMessage(error);
      setSaveError(message);
      Alert.alert('AI generation failed', message);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveReviewer = async (status: ReviewerStatus = 'Ready') => {
    if (isSaving) {
      return createdReviewer;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const input = {
        ...buildReviewerInput(status),
        title: reviewerTitle,
      };
      const reviewer = createdReviewer
        ? await updateReviewer(createdReviewer.id, input)
        : await createReviewer(input);
      setCreatedReviewer(reviewer);
      return reviewer;
    } catch (error) {
      const message = getErrorMessage(error);
      setSaveError(message);
      Alert.alert('Unable to save reviewer', message);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReviewer = async () => {
    const reviewer = await saveReviewer('Ready');

    if (!reviewer) {
      return;
    }

    Alert.alert('Reviewer saved', `${reviewer.title} is ready in your library.`);
    setStep('detail');
  };

  const handleExportReviewer = async () => {
    if (!createdReviewer) {
      const reviewer = await saveReviewer('Exported');

      if (!reviewer) {
        return;
      }

      Alert.alert('Reviewer exported', `${reviewer.title}.${format.toLowerCase()} is prepared.`);
      setStep('detail');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (createdReviewer.status !== 'Exported') {
        await updateReviewerStatus(createdReviewer.id, 'Exported');
        setCreatedReviewer({ ...createdReviewer, status: 'Exported' });
      }

      Alert.alert(
        'Reviewer exported',
        `${createdReviewer.title}.${format.toLowerCase()} is prepared.`
      );
      setStep('detail');
    } catch (error) {
      const message = getErrorMessage(error);
      setSaveError(message);
      Alert.alert('Unable to export reviewer', message);
    } finally {
      setIsSaving(false);
    }
  };

  if (step === 'materials') {
    return (
      <LearningMaterialsScreen
        libraryId={selectedLibrary?.id ?? null}
        libraryName={selectedLibrary?.name ?? null}
        onBack={() => setStep('setup')}
        onMaterialRemoved={untrackSavedMaterial}
        onMaterialSaved={trackSavedMaterial}
      />
    );
  }

  if (studyReviewer) {
    return (
      <ReviewerStudyPage
        initialMode={studyMode}
        reviewer={studyReviewer}
        onBack={() => setStudyReviewer(null)}
      />
    );
  }

  if (step === 'extracting') {
    return (
      <ExtractionScreen
        errorMessage={saveError}
        isExtracting={isExtracting}
        onBack={() => setStep('setup')}
        isGenerating={isGenerating}
        summary={extractionSummary}
        onContinue={generateAiQuestions}
        onRescan={prepareExtraction}
      />
    );
  }

  if (step === 'questions') {
    return (
      <QuestionGenerationScreen
        category={category}
        difficulty={difficulty}
        estimatedItems={estimatedItems}
        generatedQuestions={generatedQuestions}
        extractionSummary={extractionSummary}
        reviewerTitle={reviewerTitle}
        subject={effectiveSubject}
        errorMessage={saveError}
        isGenerating={isGenerating}
        isSaving={isSaving}
        onBack={() => setStep('extracting')}
        onExport={() => setStep('export')}
        onSave={handleSaveReviewer}
        onRegenerate={generateAiQuestions}
      />
    );
  }

  if (step === 'export') {
    return (
      <ExportSettingsScreen
        format={format}
        includeAnswers={includeAnswers}
        includeExplanations={includeExplanations}
        includeHeader={includeHeader}
        reviewerTitle={reviewerTitle}
        theme={theme}
        isSaving={isSaving}
        onBack={() => setStep('questions')}
        onDownload={handleExportReviewer}
        onFormatChange={setFormat}
        onToggleAnswers={setIncludeAnswers}
        onToggleExplanations={setIncludeExplanations}
        onToggleHeader={setIncludeHeader}
        onThemeChange={() =>
          setTheme((current) =>
            current === 'Modern Academic' ? 'Compact Review Sheet' : 'Modern Academic'
          )
        }
      />
    );
  }

  if (step === 'detail') {
    return (
      <ReviewerDetailScreen
        category={category}
        mastery={mastery}
        reviewer={createdReviewer}
        generatedQuestions={createdReviewer?.generatedQuestions ?? generatedQuestions}
        reviewerTitle={reviewerTitle}
        subject={effectiveSubject}
        onEdit={() => setStep('setup')}
        onExport={() => setStep('export')}
        onOpenAIChat={onOpenAIChat}
        onStartQuiz={() => {
          if (createdReviewer) {
            setStudyMode('quiz');
            setStudyReviewer(createdReviewer);
          }
        }}
        onStudyFlashcards={() => {
          if (createdReviewer) {
            setStudyMode('flashcards');
            setStudyReviewer(createdReviewer);
          }
        }}
        onBack={onOpenReviewers}
      />
    );
  }

  return (
    <SetupScreen
      category={category}
      categories={mergeSuggestion(categorySuggestions, category)}
      difficulty={difficulty}
      estimatedItems={estimatedItems}
      guidanceText={buildSetupGuidance(calculatedContext)}
      libraries={libraries}
      selectedLibraryId={selectedLibraryId}
      questions={questions}
      subject={subject}
      subjects={mergeSuggestion(subjectSuggestions, subject)}
      title={title}
      onBack={onBack}
      onCategoryChange={setCategory}
      onDifficultyChange={setDifficulty}
      onLibraryChange={(library) => {
        setSelectedLibraryId(library?.id ?? null);
        if (library) {
          setSubject((current) => current.trim() || library.name);
          setCategory(library.name);
        }
      }}
      onGenerate={handleGenerate}
      onAddDocument={() => setStep('materials')}
      onQuestionCountChange={updateQuestionCount}
      onSubjectChange={setSubject}
      onTitleChange={setTitle}
    />
  );
}

async function buildExtractionSummary({
  currentSubject,
  materialIds,
  selectedLibrary,
}: {
  currentSubject: string;
  materialIds: string[];
  selectedLibrary: LibraryRecord | null;
}): Promise<ExtractionSummary> {
  const materials = materialIds.length > 0 ? await fetchLearningMaterialsByIds(materialIds) : [];
  const readableMaterials = materials.filter((material) => material.extractedText?.trim());
  const sourceText = buildSourceText(materials);
  const detectedTopics = detectTopics(sourceText, materials);
  const detectedSubject =
    currentSubject.trim() ||
    selectedLibrary?.name ||
    detectSubject(sourceText, materials, detectedTopics) ||
    'General Study';
  const warnings: string[] = [];

  if (materials.length === 0) {
    warnings.push(
      'No learning material is attached. TalinoQ will generate from your subject setup.'
    );
  }

  if (materials.length > 0 && readableMaterials.length === 0) {
    warnings.push(
      'Your files are saved, but no readable text was extracted yet. Pasted text or clearer files improve AI accuracy.'
    );
  }

  return {
    characterCount: sourceText.length,
    detectedSubject,
    detectedTopics,
    materialCount: materials.length,
    materials,
    previewText: sourceText
      ? sourceText.replace(/\s+/g, ' ').trim().slice(0, 360)
      : `No extracted text yet. The reviewer will use ${detectedSubject} and your configuration.`,
    readableCount: readableMaterials.length,
    sourceText,
    warnings,
  };
}

function buildSourceText(materials: MaterialPreview[]) {
  return materials
    .map((material, index) => {
      const extracted = material.extractedText?.trim();
      const fallback = [material.title, material.summary, material.subtitle, material.url]
        .filter(Boolean)
        .join('\n');

      return [
        `SOURCE ${index + 1}: ${material.title}`,
        `TYPE: ${material.sourceType ?? material.kind}`,
        extracted || fallback,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n')
    .trim()
    .slice(0, 14000);
}

function detectSubject(text: string, materials: MaterialPreview[], topics: string[]) {
  const haystack = `${text} ${materials.map((material) => material.title).join(' ')} ${topics.join(
    ' '
  )}`.toLowerCase();
  const subjectSignals = [
    {
      subject: 'Biology',
      terms: ['cell', 'mitochondria', 'protein', 'photosynthesis', 'respiration', 'organism'],
    },
    {
      subject: 'Physics',
      terms: ['quantum', 'force', 'energy', 'momentum', 'wave', 'electron', 'motion'],
    },
    {
      subject: 'Chemistry',
      terms: ['molecule', 'compound', 'reaction', 'acid', 'base', 'chemical', 'organic'],
    },
    {
      subject: 'Mathematics',
      terms: ['derivative', 'integral', 'equation', 'function', 'calculus', 'algebra'],
    },
    {
      subject: 'Computer Science',
      terms: ['program', 'algorithm', 'database', 'python', 'code', 'javascript', 'software'],
    },
    {
      subject: 'History',
      terms: ['revolution', 'war', 'empire', 'colonial', 'ancient', 'industrial'],
    },
    {
      subject: 'Law',
      terms: ['civil law', 'contract', 'statute', 'court', 'legal', 'rights'],
    },
  ];

  const ranked = subjectSignals
    .map((signal) => ({
      subject: signal.subject,
      score: signal.terms.reduce(
        (total, term) => total + (haystack.includes(term) ? term.length : 0),
        0
      ),
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score ? ranked[0].subject : '';
}

function detectTopics(text: string, materials: MaterialPreview[]) {
  const candidates = new Map<string, number>();
  const source = `${materials.map((material) => material.title).join(' ')} ${text}`
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 10000);
  const phraseMatches = source.match(/\b[A-Z][a-zA-Z]+(?:\s+[A-Z]?[a-zA-Z]+){0,2}\b/g) ?? [];
  const stopWords = new Set([
    'This',
    'That',
    'The',
    'And',
    'For',
    'Your',
    'Source',
    'Type',
    'Document',
    'Image',
  ]);

  phraseMatches.forEach((phrase) => {
    const cleaned = phrase.trim();
    if (cleaned.length < 4 || stopWords.has(cleaned)) {
      return;
    }

    candidates.set(cleaned, (candidates.get(cleaned) ?? 0) + 1);
  });

  return Array.from(candidates.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic)
    .slice(0, 6);
}

function buildSetupGuidance(context: ReturnType<typeof buildCalculatedStudyContext>) {
  const focus = context.focusAreas[0];

  if (focus) {
    return `Based on your saved reviewer scores, TalinoQ recommends ${context.recommendedDifficulty} difficulty with extra practice on ${focus.name}.`;
  }

  if (context.analytics.reviewerCount > 0) {
    return `TalinoQ calculated ${context.analytics.examReadiness}% exam readiness from ${context.analytics.reviewerCount} reviewer(s). Recommended difficulty: ${context.recommendedDifficulty}.`;
  }

  return 'Add learning materials and TalinoQ will calculate subject, topics, and reviewer targets from your real saved sources.';
}

function QuestionGenerationScreen({
  category,
  difficulty,
  errorMessage,
  extractionSummary,
  estimatedItems,
  generatedQuestions,
  isGenerating,
  isSaving,
  reviewerTitle,
  subject,
  onBack,
  onExport,
  onRegenerate,
  onSave,
}: {
  category: string;
  difficulty: Difficulty;
  errorMessage?: string | null;
  extractionSummary: ExtractionSummary | null;
  estimatedItems: number;
  generatedQuestions: ReviewerQuestion[];
  isGenerating: boolean;
  isSaving: boolean;
  reviewerTitle: string;
  subject: string;
  onBack: () => void;
  onExport: () => void;
  onRegenerate: () => void;
  onSave: () => void;
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlowHeader title="Generating Reviewer" subtitle="AI question draft" onBack={onBack} />
      <ScrollView
        contentContainerStyle={styles.questionContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.aiHeroIcon}>
          <Bot size={26} color="#004f4c" />
        </View>
        <Text style={styles.igniteTitle}>Igniting Intelligence...</Text>
        <Text style={styles.igniteCopy}>
          TalinoQ scanned {extractionSummary?.materialCount ?? 0} source
          {(extractionSummary?.materialCount ?? 0) === 1 ? '' : 's'} and is crafting reviewer items
          from readable extracted text.
        </Text>

        <View style={styles.processingList}>
          <ProcessingRow
            done={Boolean(extractionSummary)}
            title="Scanning source material"
            subtitle={
              extractionSummary
                ? `${extractionSummary.readableCount}/${extractionSummary.materialCount} readable source(s)`
                : 'Preparing sources...'
            }
          />
          <ProcessingRow
            done={Boolean(extractionSummary?.detectedTopics.length)}
            title="Analyzing key topics"
            subtitle={
              extractionSummary?.detectedTopics.length
                ? extractionSummary.detectedTopics.slice(0, 3).join(', ')
                : 'Finding core concepts...'
            }
          />
          <ProcessingRow
            active={isGenerating}
            done={!isGenerating && generatedQuestions.length > 0}
            title="Generating exam reviewer"
            subtitle={
              generatedQuestions.length > 0
                ? `${generatedQuestions.length} AI questions ready`
                : 'Writing questions, explanations, and answer keys...'
            }
          />
        </View>

        {extractionSummary ? (
          <View style={styles.detectedCard}>
            <Check size={18} color="#008c84" />
            <View style={{ flex: 1 }}>
              <Text style={styles.detectedText}>{extractionSummary.detectedSubject}</Text>
              <Text style={styles.generatedMeta}>
                {extractionSummary.characterCount.toLocaleString()} extracted characters
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.generatedHeader}>
          <Text style={styles.generatedTitle}>{reviewerTitle}</Text>
          <Text style={styles.generatedMeta}>
            {generatedQuestions.length || estimatedItems} questions generated from{' '}
            {subject || 'source material'} - {difficulty}
          </Text>
        </View>

        {isGenerating && generatedQuestions.length === 0 ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color="#004f4c" />
            <Text style={styles.busyText}>Igniting intelligence from your source material...</Text>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity activeOpacity={0.85} onPress={onExport} style={styles.exportButton}>
              <ArrowDownToLine size={13} color="#ffffff" />
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSaving || generatedQuestions.length === 0}
              onPress={onSave}
              style={[
                styles.saveButton,
                (isSaving || generatedQuestions.length === 0) && styles.disabledButton,
              ]}>
              {isSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Library size={13} color="#ffffff" />
              )}
              <Text style={styles.exportButtonText}>
                {isSaving ? 'Saving...' : 'Save Reviewer'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {errorMessage ? <Text style={styles.inlineErrorText}>{errorMessage}</Text> : null}

        {generatedQuestions.slice(0, 3).map((question, index) => (
          <View key={question.id} style={styles.questionCard}>
            <Text style={styles.questionType}>
              Question {index + 1} - {question.concept}
            </Text>
            <View style={styles.questionTools}>
              <Pencil size={15} color="#94a3b8" />
              <Trash2 size={15} color="#94a3b8" />
            </View>
            <Text style={styles.questionPrompt}>{question.prompt}</Text>
            {question.options.length > 0 ? (
              question.options.map((option, optionIndex) => (
                <AnswerOption
                  key={option.id}
                  correct={option.isCorrect}
                  letter={String.fromCharCode(65 + optionIndex)}
                  label={option.label}
                />
              ))
            ) : (
              <Text style={styles.questionExplanation}>{question.explanation}</Text>
            )}
          </View>
        ))}

        <TouchableOpacity
          activeOpacity={0.86}
          disabled={isGenerating}
          onPress={onRegenerate}
          style={[styles.regenerateButton, isGenerating && styles.disabledButton]}>
          {isGenerating ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <RefreshCcw size={15} color="#ffffff" />
          )}
          <Text style={styles.primaryButtonText}>
            {isGenerating ? 'Regenerating...' : 'Regenerate All Questions'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ExportSettingsScreen({
  format,
  includeAnswers,
  includeExplanations,
  includeHeader,
  isSaving,
  reviewerTitle,
  theme,
  onBack,
  onDownload,
  onFormatChange,
  onThemeChange,
  onToggleAnswers,
  onToggleExplanations,
  onToggleHeader,
}: {
  format: ExportFormat;
  includeAnswers: boolean;
  includeExplanations: boolean;
  includeHeader: boolean;
  isSaving: boolean;
  reviewerTitle: string;
  theme: string;
  onBack: () => void;
  onDownload: () => void;
  onFormatChange: (format: ExportFormat) => void;
  onThemeChange: () => void;
  onToggleAnswers: (value: boolean) => void;
  onToggleExplanations: (value: boolean) => void;
  onToggleHeader: (value: boolean) => void;
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlowHeader title="Export Reviewer" subtitle="Format and preview" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.exportContent} showsVerticalScrollIndicator={false}>
        <View style={styles.exportPanel}>
          <Text style={styles.exportTitle}>Export Settings</Text>
          <Text style={styles.exportLabel}>FILE FORMAT</Text>
          <View style={styles.formatRow}>
            <FormatButton
              active={format === 'PDF'}
              label="PDF"
              onPress={() => onFormatChange('PDF')}
            />
            <FormatButton
              active={format === 'DOCX'}
              label="DOCX"
              onPress={() => onFormatChange('DOCX')}
            />
          </View>

          <ExportToggle
            label="Answer Key"
            subtitle="Include solutions at the end"
            value={includeAnswers}
            onValueChange={onToggleAnswers}
          />
          <ExportToggle
            label="AI Explanations"
            subtitle="Step-by-step reasoning per question"
            value={includeExplanations}
            onValueChange={onToggleExplanations}
          />
          <ExportToggle
            label="Student Header"
            subtitle="Fields for name, date, and ID"
            value={includeHeader}
            onValueChange={onToggleHeader}
          />

          <Text style={styles.exportLabel}>TYPOGRAPHY THEME</Text>
          <TouchableOpacity activeOpacity={0.82} onPress={onThemeChange} style={styles.themeSelect}>
            <Text style={styles.themeText}>{theme}</Text>
            <ChevronDown size={17} color="#004f4c" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          disabled={isSaving}
          onPress={onDownload}
          style={[styles.downloadButton, isSaving && styles.disabledButton]}>
          {isSaving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <ArrowDownToLine size={15} color="#ffffff" />
          )}
          <Text style={styles.primaryButtonText}>
            {isSaving ? 'Saving reviewer...' : 'Download Reviewer'}
          </Text>
        </TouchableOpacity>

        <View style={styles.previewHeader}>
          <Text style={styles.previewLabel}>Live Preview (Page 1 of 4)</Text>
          <View style={styles.previewTools}>
            <Search size={13} color="#64748b" />
            <Plus size={13} color="#64748b" />
          </View>
        </View>

        <View style={styles.previewPage}>
          <View style={styles.previewTop}>
            <View>
              <Text style={styles.previewTitle}>
                Introduction to {reviewerTitle.replace(' Reviewer', '')}
              </Text>
              <Text style={styles.previewSub}>FINAL REVIEWER - MODULE 3-4</Text>
            </View>
            <View style={styles.previewIcon}>
              <Library size={20} color="#ffffff" />
            </View>
          </View>
          <View style={styles.previewLine} />
          <View style={styles.previewLineShort} />
          <Text style={styles.previewQuestion}>
            01. Which of the following best describes the principle of wave-particle duality?
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReviewerDetailScreen({
  category,
  generatedQuestions,
  mastery,
  reviewer,
  reviewerTitle,
  subject,
  onBack,
  onEdit,
  onExport,
  onOpenAIChat,
  onStartQuiz,
  onStudyFlashcards,
}: {
  category: string;
  generatedQuestions: ReviewerQuestion[];
  mastery: number;
  reviewer: ReviewerRecord | null;
  reviewerTitle: string;
  subject: string;
  onBack: () => void;
  onEdit: () => void;
  onExport: () => void;
  onOpenAIChat: () => void;
  onStartQuiz: () => void;
  onStudyFlashcards: () => void;
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlowHeader title="Reviewer Ready" subtitle="Study or export" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.detailEyebrow}>
          {(reviewer?.subject ?? subject).toUpperCase()} - {category.toUpperCase()}
        </Text>
        <Text style={styles.detailTitle}>{reviewer?.title ?? reviewerTitle}</Text>
        <View style={styles.tagRow}>
          {(reviewer?.tags?.length ? reviewer.tags : ['reviewer', subject || 'study']).map(
            (tag) => (
              <Tag key={tag} label={`#${tag}`} />
            )
          )}
        </View>

        <View style={styles.detailStatsRow}>
          <View style={styles.detailStat}>
            <Text style={styles.detailStatLabel}>Mastery Score</Text>
            <Text style={styles.masteryValue}>{mastery}%</Text>
            <View style={styles.masteryTrack}>
              <View style={[styles.masteryFill, { width: `${mastery}%` as `${number}%` }]} />
            </View>
          </View>
          <View style={styles.detailStat}>
            <Text style={styles.detailStatLabel}>Saved Items</Text>
            <Text style={styles.streakValue}>
              {reviewer?.generatedQuestions.length ?? generatedQuestions.length}
            </Text>
          </View>
        </View>

        <View style={styles.readyCard}>
          <View style={styles.readyIcon}>
            <BookOpen size={22} color="#ffffff" />
          </View>
          <View style={styles.readyTextBlock}>
            <Text style={styles.readyTitle}>Ready for Quiz</Text>
            <Text style={styles.readySubtitle}>
              {reviewer
                ? `${reviewer.generatedQuestions.length} saved AI question(s)`
                : `${generatedQuestions.length} generated question(s)`}
            </Text>
          </View>
          <Sparkles size={17} color="#facc15" />
        </View>

        <TouchableOpacity activeOpacity={0.86} onPress={onStartQuiz} style={styles.startQuizButton}>
          <Zap size={16} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Start Quiz</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={onStudyFlashcards}
          style={styles.flashcardButton}>
          <Library size={16} color="#004f4c" />
          <Text style={styles.flashcardText}>Study Flashcards</Text>
        </TouchableOpacity>

        <View style={styles.detailActionRow}>
          <TouchableOpacity activeOpacity={0.8} onPress={onEdit} style={styles.miniButton}>
            <Text style={styles.miniButtonText}>Edit Reviewer</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={onExport} style={styles.miniButtonActive}>
            <Text style={styles.miniButtonActiveText}>Export PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenAIChat}
            style={styles.miniButtonActive}>
            <Text style={styles.miniButtonActiveText}>Ask AI to Improve</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeaderCompact}>
          <Text style={styles.topicsTitle}>Topics Covered</Text>
          <Text style={styles.viewAllText}>View All</Text>
        </View>
        {Array.from(new Set(generatedQuestions.map((question) => question.concept)))
          .slice(0, 4)
          .map((topic) => (
            <TopicRow
              key={topic}
              title={topic}
              subtitle={`${
                generatedQuestions.filter((question) => question.concept === topic).length
              } question(s)`}
            />
          ))}

        <View style={styles.generatedArtwork}>
          <View style={styles.artBurst} />
          <Text style={styles.artText}>
            Generated{' '}
            {reviewer?.createdAt ? new Date(reviewer.createdAt).toLocaleDateString() : 'today'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FlowHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.flowHeader}>
      <TouchableOpacity
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        style={styles.flowBackButton}>
        <ArrowLeft size={21} color="#004f4c" />
      </TouchableOpacity>

      <View style={styles.flowHeaderText}>
        <Text style={styles.flowTitle}>{title}</Text>
        <Text style={styles.flowSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.flowHeaderSpacer} />
    </View>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function ProcessingRow({
  active,
  done,
  title,
  subtitle,
}: {
  active?: boolean;
  done?: boolean;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.processingRow}>
      <View style={[styles.processingIcon, done && styles.processingIconDone]}>
        {active ? (
          <ActivityIndicator color="#008c84" size="small" />
        ) : done ? (
          <Check size={12} color="#008c84" />
        ) : (
          <RefreshCcw size={11} color="#008c84" />
        )}
      </View>
      <View>
        <Text style={styles.processingTitle}>{title}</Text>
        <Text style={[styles.processingSubtitle, done && styles.processingSubtitleDone]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function AnswerOption({
  letter,
  label,
  correct,
}: {
  letter: string;
  label: string;
  correct?: boolean;
}) {
  return (
    <View style={[styles.answerOption, correct && styles.answerOptionCorrect]}>
      <View style={[styles.answerLetter, correct && styles.answerLetterCorrect]}>
        <Text style={[styles.answerLetterText, correct && styles.answerLetterTextCorrect]}>
          {letter}
        </Text>
      </View>
      <Text style={[styles.answerLabel, correct && styles.answerLabelCorrect]}>{label}</Text>
      {correct ? <Check size={14} color="#00a56a" /> : null}
    </View>
  );
}

function FormatButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: ExportFormat;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.formatButton, active && styles.formatButtonActive]}>
      <Text style={styles.formatIcon}>{label === 'PDF' ? 'PDF' : 'DOCX'}</Text>
      <Text style={[styles.formatText, active && styles.formatTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ExportToggle({
  label,
  subtitle,
  value,
  onValueChange,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.exportToggle}>
      <View>
        <Text style={styles.exportToggleLabel}>{label}</Text>
        <Text style={styles.exportToggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function TopicRow({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <TouchableOpacity activeOpacity={0.82} style={styles.topicRow}>
      <View style={styles.topicIcon}>
        <BookOpen size={17} color="#008c84" />
      </View>
      <View style={styles.topicTextBlock}>
        <Text style={styles.topicTitle}>{title}</Text>
        <Text style={styles.topicSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.topicChevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: APP_PAGE_BACKGROUND,
    flex: 1,
  },
  flowHeader: {
    alignItems: 'center',
    backgroundColor: APP_PAGE_BACKGROUND,
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: APP_PAGE_HORIZONTAL_PADDING,
    paddingVertical: 12,
  },
  flowBackButton: {
    alignItems: 'center',
    backgroundColor: '#eefafa',
    borderColor: '#ccefed',
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  flowHeaderText: {
    flex: 1,
  },
  flowTitle: {
    color: '#004f4c',
    fontSize: 16,
    fontWeight: '900',
  },
  flowSubtitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  flowHeaderSpacer: {
    width: 42,
  },
  setupContent: {
    paddingHorizontal: APP_PAGE_HORIZONTAL_PADDING,
    paddingTop: 18,
    paddingBottom: APP_FLOW_BOTTOM_PADDING,
  },
  setupTitle: {
    color: '#172033',
    fontSize: 17,
    fontWeight: '800',
  },
  setupCopy: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
  },
  sectionTitle: {
    color: '#173635',
    fontSize: 13,
    fontWeight: '900',
  },
  fieldLabel: {
    color: '#172033',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 6,
    borderWidth: 1,
    color: '#172033',
    fontSize: 13,
    height: 44,
    paddingHorizontal: 12,
  },
  searchField: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: '#172033',
    flex: 1,
    fontSize: 13,
    height: 44,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 9,
  },
  suggestionChip: {
    backgroundColor: '#eef5fa',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionChipActive: {
    backgroundColor: '#d9fbf7',
  },
  suggestionText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
  },
  suggestionTextActive: {
    color: '#004f4c',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryChipActive: {
    backgroundColor: '#004f4c',
    borderColor: '#004f4c',
  },
  categoryText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  segmented: {
    backgroundColor: '#f0f3fb',
    borderColor: '#c8d0df',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 10,
    padding: 2,
  },
  segment: {
    alignItems: 'center',
    borderRadius: 5,
    flex: 1,
    paddingVertical: 10,
  },
  segmentActive: {
    backgroundColor: '#004f4c',
  },
  segmentText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  configList: {
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  configRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    padding: 12,
  },
  configText: {
    flex: 1,
  },
  configTitle: {
    color: '#172033',
    fontSize: 12,
    fontWeight: '900',
  },
  configSubtitle: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  stepButton: {
    alignItems: 'center',
    backgroundColor: '#e8edff',
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  stepSymbol: {
    color: '#5a6fd6',
    fontSize: 16,
    fontWeight: '900',
  },
  stepValue: {
    color: '#173635',
    fontSize: 13,
    fontWeight: '900',
    minWidth: 24,
    textAlign: 'center',
  },
  guidanceCard: {
    backgroundColor: '#005c58',
    borderRadius: 10,
    marginTop: 18,
    padding: 16,
  },
  guidanceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  guidanceTitle: {
    color: '#dffcf9',
    fontSize: 14,
    fontWeight: '900',
  },
  guidanceText: {
    color: '#b7e6e2',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  guidanceButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0e8b82',
    borderRadius: 6,
    marginTop: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  guidanceButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  compositionLabel: {
    color: '#172033',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 22,
  },
  compositionCard: {
    borderColor: '#d3d8ef',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  summaryRow: {
    alignItems: 'center',
    backgroundColor: '#f5f7ff',
    borderBottomColor: '#d3d8ef',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  summaryValue: {
    color: '#004f4c',
    fontSize: 12,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#007a48',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 22,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.68,
  },
  inlineErrorText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: 10,
  },
  busyRow: {
    alignItems: 'center',
    backgroundColor: '#eefafa',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    padding: 13,
  },
  busyText: {
    color: '#004f4c',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#004f4c',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 11,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: '#004f4c',
    fontSize: 12,
    fontWeight: '900',
  },
  extractionContent: {
    paddingHorizontal: APP_PAGE_HORIZONTAL_PADDING,
    paddingTop: 18,
    paddingBottom: APP_FLOW_BOTTOM_PADDING,
  },
  scanHero: {
    alignItems: 'center',
    paddingTop: 20,
  },
  scanRing: {
    alignItems: 'center',
    borderColor: '#b8f3d3',
    borderRadius: 999,
    borderWidth: 4,
    height: 104,
    justifyContent: 'center',
    width: 104,
  },
  scanIcon: {
    alignItems: 'center',
    backgroundColor: '#006f6a',
    borderRadius: 18,
    height: 66,
    justifyContent: 'center',
    width: 66,
  },
  scanTitle: {
    color: '#004f4c',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 14,
  },
  scanCopy: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 5,
    textAlign: 'center',
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 26,
  },
  statusTile: {
    backgroundColor: '#ffffff',
    borderLeftColor: '#42d8e7',
    borderLeftWidth: 3,
    flex: 1,
    padding: 12,
  },
  statusTileActive: {
    borderLeftColor: '#00d382',
  },
  statusLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
  },
  statusValue: {
    color: '#004f4c',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 3,
  },
  extractedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 9,
    marginTop: 10,
    padding: 14,
  },
  extractedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  extractedLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '900',
  },
  characterCount: {
    color: '#94a3b8',
    fontSize: 9,
  },
  extractedText: {
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  detectedLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 18,
  },
  detectedCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 9,
    marginTop: 8,
    padding: 14,
  },
  detectedText: {
    color: '#004f4c',
    fontSize: 13,
    fontWeight: '900',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 11,
  },
  tag: {
    backgroundColor: '#d9fbf7',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  tagText: {
    color: '#008c84',
    fontSize: 10,
    fontWeight: '800',
  },
  addTag: {
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  addTagText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  questionContent: {
    paddingHorizontal: APP_PAGE_HORIZONTAL_PADDING,
    paddingTop: 18,
    paddingBottom: APP_FLOW_BOTTOM_PADDING,
  },
  aiHeroIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#d9fbf7',
    borderColor: '#9ee8df',
    borderRadius: 12,
    borderWidth: 1,
    height: 66,
    justifyContent: 'center',
    marginTop: 20,
    width: 66,
  },
  igniteTitle: {
    color: '#004f4c',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 18,
    textAlign: 'center',
  },
  igniteCopy: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
    textAlign: 'center',
  },
  processingList: {
    gap: 10,
    marginTop: 22,
  },
  processingRow: {
    alignItems: 'center',
    backgroundColor: '#e1f8ed',
    borderColor: '#a2e8cd',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  processingIcon: {
    alignItems: 'center',
    borderColor: '#008c84',
    borderRadius: 999,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  processingIconDone: {
    backgroundColor: '#d9fbf7',
  },
  processingTitle: {
    color: '#004f4c',
    fontSize: 12,
    fontWeight: '900',
  },
  processingSubtitle: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  processingSubtitleDone: {
    color: '#00a56a',
  },
  generatedHeader: {
    marginTop: 20,
  },
  generatedTitle: {
    color: '#004f4c',
    fontSize: 20,
    fontWeight: '900',
  },
  generatedMeta: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  exportButton: {
    alignItems: 'center',
    backgroundColor: '#00a56a',
    borderRadius: 6,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#005c58',
    borderRadius: 6,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderLeftColor: '#008c84',
    borderLeftWidth: 4,
    borderRadius: 8,
    marginTop: 18,
    padding: 15,
  },
  questionTools: {
    flexDirection: 'row',
    gap: 12,
    position: 'absolute',
    right: 15,
    top: 15,
  },
  questionType: {
    color: '#00a56a',
    fontSize: 10,
    fontWeight: '900',
  },
  questionPrompt: {
    color: '#004f4c',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 19,
    marginTop: 14,
  },
  questionExplanation: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  answerOption: {
    alignItems: 'center',
    backgroundColor: '#f4f7fb',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    padding: 13,
  },
  answerOptionCorrect: {
    backgroundColor: '#fffbea',
    borderColor: '#facc15',
    borderWidth: 1,
  },
  answerLetter: {
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  answerLetterCorrect: {
    backgroundColor: '#facc15',
  },
  answerLetterText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
  },
  answerLetterTextCorrect: {
    color: '#ffffff',
  },
  answerLabel: {
    color: '#64748b',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  answerLabelCorrect: {
    color: '#004f4c',
  },
  regenerateButton: {
    alignItems: 'center',
    backgroundColor: '#005c58',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 22,
    paddingVertical: 15,
  },
  exportContent: {
    paddingHorizontal: APP_PAGE_HORIZONTAL_PADDING,
    paddingTop: 18,
    paddingBottom: APP_FLOW_BOTTOM_PADDING,
  },
  exportPanel: {
    backgroundColor: '#f2fbfb',
    borderColor: '#d3eeee',
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  exportTitle: {
    color: '#004f4c',
    fontSize: 22,
    fontWeight: '900',
  },
  exportLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 22,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  formatButton: {
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    borderColor: 'transparent',
    borderRadius: 10,
    borderWidth: 2,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  formatButtonActive: {
    backgroundColor: '#ffffff',
    borderColor: '#006f6a',
  },
  formatIcon: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '900',
  },
  formatText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '900',
  },
  formatTextActive: {
    color: '#004f4c',
  },
  exportToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 17,
  },
  exportToggleLabel: {
    color: '#004f4c',
    fontSize: 12,
    fontWeight: '900',
  },
  exportToggleSubtitle: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 3,
  },
  themeSelect: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d9e6ea',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    padding: 14,
  },
  themeText: {
    color: '#004f4c',
    fontSize: 12,
    fontWeight: '800',
  },
  downloadButton: {
    alignItems: 'center',
    backgroundColor: '#006f6a',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 16,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  previewLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  previewTools: {
    flexDirection: 'row',
    gap: 10,
  },
  previewPage: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    minHeight: 270,
    padding: 22,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewTitle: {
    color: '#004f4c',
    fontSize: 19,
    fontWeight: '900',
    maxWidth: 230,
  },
  previewSub: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 8,
  },
  previewIcon: {
    alignItems: 'center',
    backgroundColor: '#006f6a',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  previewLine: {
    backgroundColor: '#e2e8f0',
    height: 1,
    marginTop: 35,
  },
  previewLineShort: {
    backgroundColor: '#e2e8f0',
    height: 1,
    marginTop: 18,
    width: '70%',
  },
  previewQuestion: {
    color: '#334155',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 40,
  },
  detailContent: {
    paddingHorizontal: APP_PAGE_HORIZONTAL_PADDING,
    paddingTop: 18,
    paddingBottom: APP_FLOW_BOTTOM_PADDING,
  },
  detailEyebrow: {
    color: '#008c84',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  detailTitle: {
    color: '#004f4c',
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 28,
    marginTop: 8,
  },
  detailStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  detailStat: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    flex: 1,
    minHeight: 91,
    padding: 15,
  },
  detailStatLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  masteryValue: {
    color: '#007a48',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 5,
  },
  masteryTrack: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    height: 6,
    marginTop: 8,
    overflow: 'hidden',
  },
  masteryFill: {
    backgroundColor: '#00c96f',
    height: '100%',
  },
  streakValue: {
    color: '#004f4c',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 11,
  },
  readyCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 14,
    marginTop: 16,
    padding: 16,
  },
  readyIcon: {
    alignItems: 'center',
    backgroundColor: '#006f6a',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  readyTextBlock: {
    flex: 1,
  },
  readyTitle: {
    color: '#004f4c',
    fontSize: 13,
    fontWeight: '900',
  },
  readySubtitle: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 3,
  },
  startQuizButton: {
    alignItems: 'center',
    backgroundColor: '#006f6a',
    borderRadius: 11,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 17,
  },
  flashcardButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#006f6a',
    borderRadius: 11,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 15,
  },
  flashcardText: {
    color: '#004f4c',
    fontSize: 12,
    fontWeight: '900',
  },
  detailActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  miniButton: {
    alignItems: 'center',
    backgroundColor: '#eef2f7',
    borderRadius: 7,
    flex: 1,
    paddingVertical: 11,
  },
  miniButtonText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
  },
  miniButtonActive: {
    alignItems: 'center',
    backgroundColor: '#23d16e',
    borderRadius: 7,
    flex: 1,
    paddingVertical: 11,
  },
  miniButtonActiveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  sectionHeaderCompact: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  topicsTitle: {
    color: '#004f4c',
    fontSize: 17,
    fontWeight: '900',
  },
  viewAllText: {
    color: '#008c84',
    fontSize: 11,
    fontWeight: '900',
  },
  topicRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    marginTop: 11,
    padding: 14,
  },
  topicIcon: {
    alignItems: 'center',
    backgroundColor: '#e3fbff',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  topicTextBlock: {
    flex: 1,
  },
  topicTitle: {
    color: '#004f4c',
    fontSize: 12,
    fontWeight: '900',
  },
  topicSubtitle: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 3,
  },
  topicChevron: {
    color: '#cbd5e1',
    fontSize: 22,
    fontWeight: '900',
  },
  generatedArtwork: {
    backgroundColor: '#004f4c',
    borderRadius: 16,
    height: 154,
    marginTop: 20,
    overflow: 'hidden',
    padding: 16,
  },
  artBurst: {
    alignSelf: 'center',
    backgroundColor: '#e2b15d',
    borderRadius: 999,
    height: 190,
    opacity: 0.35,
    position: 'absolute',
    top: -50,
    width: 190,
  },
  artText: {
    color: '#dffcf9',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 'auto',
  },
});
