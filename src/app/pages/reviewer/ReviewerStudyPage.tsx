import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  Brain,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Layers,
  ListChecks,
  PenLine,
  RotateCcw,
  Trophy,
  WifiOff,
  XCircle,
} from 'lucide-react-native';

import {
  buildFallbackReviewerQuestions,
  updateReviewerStudyProgress,
  type ReviewerQuestion,
  type ReviewerRecord,
} from '@/lib/reviewers';
import { subscribeToNetworkStatus } from '@/lib/networkService';

export type ReviewerStudyMode = 'quiz' | 'flashcards' | 'typed' | 'enumeration' | 'essay' | 'review';

type AnswerResult = {
  mode: ReviewerStudyMode;
  question: ReviewerQuestion;
  response: string;
  correctAnswer: string;
  isCorrect: boolean;
  score: number;
};

type ReviewerStudyPageProps = {
  initialMode?: ReviewerStudyMode;
  onBack: () => void;
  reviewer: ReviewerRecord;
};

const modeTabs: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  mode: ReviewerStudyMode;
}[] = [
  { icon: Brain, label: 'Quiz', mode: 'quiz' },
  { icon: Layers, label: 'Cards', mode: 'flashcards' },
  { icon: PenLine, label: 'Type', mode: 'typed' },
  { icon: ListChecks, label: 'List', mode: 'enumeration' },
  { icon: FileText, label: 'Essay', mode: 'essay' },
];

export function ReviewerStudyPage({
  initialMode = 'quiz',
  onBack,
  reviewer,
}: ReviewerStudyPageProps) {
  const questions = useMemo(
    () =>
      reviewer.generatedQuestions.length > 0
        ? reviewer.generatedQuestions
        : buildFallbackReviewerQuestions({
            difficulty: reviewer.difficulty,
            subject: reviewer.subject,
          }),
    [reviewer]
  );
  const [mode, setMode] = useState<ReviewerStudyMode>(initialMode);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [essayAnswer, setEssayAnswer] = useState('');
  const [enumerationAnswers, setEnumerationAnswers] = useState(['', '', '']);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Record<string, boolean>>({});
  const [answerResults, setAnswerResults] = useState<Record<string, AnswerResult>>({});
  const [sessionQuestionIds, setSessionQuestionIds] = useState<string[] | null>(null);
  const [resultsMode, setResultsMode] = useState<ReviewerStudyMode>('quiz');
  const [savingProgress, setSavingProgress] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => subscribeToNetworkStatus(setOnline), []);

  const activeQuestions = useMemo(
    () =>
      sessionQuestionIds
        ? questions.filter((question) => sessionQuestionIds.includes(question.id))
        : questions,
    [questions, sessionQuestionIds]
  );
  const activeQuestion = activeQuestions[Math.min(currentIndex, activeQuestions.length - 1)];
  const progressPercent =
    activeQuestions.length > 0 ? ((currentIndex + 1) / activeQuestions.length) * 100 : 0;
  const currentResult = activeQuestion ? answerResults[activeQuestion.id] : null;

  const switchMode = (nextMode: ReviewerStudyMode) => {
    setMode(nextMode);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setTypedAnswer('');
    setEssayAnswer('');
    setEnumerationAnswers(['', '', '']);
    setCardFlipped(false);
    setSessionQuestionIds(null);
  };

  const saveProgress = async (results: AnswerResult[], completedMode: ReviewerStudyMode) => {
    if (results.length === 0) {
      return;
    }

    const correct = results.filter((result) => result.isCorrect).length;
    const score =
      completedMode === 'essay'
        ? Math.round(results.reduce((total, result) => total + result.score, 0) / results.length)
        : Math.round((correct / results.length) * 100);

    setSavingProgress(true);
    try {
      await updateReviewerStudyProgress(reviewer.id, {
        correct,
        score,
        total: results.length,
      });
    } catch (error) {
      Alert.alert(
        'Progress not saved',
        error instanceof Error ? error.message : 'Your answers stayed on this device for now.'
      );
    } finally {
      setSavingProgress(false);
    }
  };

  const completeSession = async (results: Record<string, AnswerResult>, completedMode = mode) => {
    const nextResults = Object.values(results);
    setResultsMode(completedMode);
    setMode('review');
    await saveProgress(nextResults, completedMode);
  };

  const resetQuestionInput = () => {
    setSelectedOptionId(null);
    setTypedAnswer('');
    setEssayAnswer('');
    setEnumerationAnswers(['', '', '']);
  };

  const goNext = async (nextResults = answerResults, completedMode = mode) => {
    if (currentIndex >= activeQuestions.length - 1) {
      await completeSession(nextResults, completedMode);
      return;
    }

    setCurrentIndex((value) => value + 1);
    resetQuestionInput();
  };

  const submitMultipleChoice = async () => {
    if (!activeQuestion || !selectedOptionId) {
      return;
    }

    const selectedOption = activeQuestion.options.find((option) => option.id === selectedOptionId);
    const correctAnswer = getCorrectAnswer(activeQuestion);
    const isCorrect = Boolean(selectedOption?.isCorrect);
    const nextResults = {
      ...answerResults,
      [activeQuestion.id]: {
        correctAnswer,
        isCorrect,
        mode,
        question: activeQuestion,
        response: selectedOption?.label ?? '',
        score: isCorrect ? 100 : 0,
      },
    };

    setAnswerResults(nextResults);
    await goNext(nextResults, mode);
  };

  const submitTypedAnswer = async () => {
    if (!activeQuestion || !typedAnswer.trim()) {
      return;
    }

    const correctAnswer = getCorrectAnswer(activeQuestion);
    const isCorrect = isSimilarAnswer(typedAnswer, correctAnswer, activeQuestion.concept);
    const nextResults = {
      ...answerResults,
      [activeQuestion.id]: {
        correctAnswer,
        isCorrect,
        mode,
        question: activeQuestion,
        response: typedAnswer.trim(),
        score: isCorrect ? 100 : 45,
      },
    };

    setAnswerResults(nextResults);
    await goNext(nextResults, mode);
  };

  const submitEnumeration = async () => {
    if (!activeQuestion || enumerationAnswers.every((answer) => !answer.trim())) {
      return;
    }

    const expectedAnswers = getEnumerationAnswers(activeQuestion);
    const joinedAnswer = enumerationAnswers.filter((answer) => answer.trim()).join(', ');
    const matched = expectedAnswers.filter((expected) =>
      enumerationAnswers.some((answer) => isSimilarAnswer(answer, expected, activeQuestion.concept))
    ).length;
    const score = Math.round((matched / Math.max(1, expectedAnswers.length)) * 100);
    const nextResults = {
      ...answerResults,
      [activeQuestion.id]: {
        correctAnswer: expectedAnswers.join(', '),
        isCorrect: score >= 70,
        mode,
        question: activeQuestion,
        response: joinedAnswer,
        score,
      },
    };

    setAnswerResults(nextResults);
    await goNext(nextResults, mode);
  };

  const submitEssay = async () => {
    if (!activeQuestion || essayAnswer.trim().length < 40) {
      Alert.alert('Add more detail', 'Write at least a few complete sentences before submitting.');
      return;
    }

    const score = scoreEssay(essayAnswer, activeQuestion);
    const nextResults = {
      ...answerResults,
      [activeQuestion.id]: {
        correctAnswer: activeQuestion.explanation,
        isCorrect: score >= 70,
        mode,
        question: activeQuestion,
        response: essayAnswer.trim(),
        score,
      },
    };

    setAnswerResults(nextResults);
    await goNext(nextResults, mode);
  };

  const markCard = async (known: boolean) => {
    if (!activeQuestion) {
      return;
    }

    const nextKnownCards = { ...knownCards, [activeQuestion.id]: known };
    setKnownCards(nextKnownCards);

    if (currentIndex >= activeQuestions.length - 1) {
      const cardResults = activeQuestions.map((question) => ({
        correctAnswer: getCorrectAnswer(question),
        isCorrect: Boolean(nextKnownCards[question.id]),
        mode: 'flashcards' as ReviewerStudyMode,
        question,
        response: nextKnownCards[question.id] ? 'Known' : 'Needs review',
        score: nextKnownCards[question.id] ? 100 : 0,
      }));
      const keyedResults = Object.fromEntries(cardResults.map((result) => [result.question.id, result]));
      setAnswerResults(keyedResults);
      await completeSession(keyedResults, 'flashcards');
      return;
    }

    setCurrentIndex((value) => value + 1);
    setCardFlipped(false);
  };

  const retryWeakQuestions = () => {
    const weakQuestionIds = new Set(
      Object.values(answerResults)
        .filter((result) => !result.isCorrect)
        .map((result) => result.question.id)
    );

    if (weakQuestionIds.size === 0) {
      switchMode('quiz');
      return;
    }

    setAnswerResults({});
    setSessionQuestionIds(
      questions.filter((question) => weakQuestionIds.has(question.id)).map((question) => question.id)
    );
    setCurrentIndex(0);
    setMode('quiz');
    resetQuestionInput();
  };

  if (!activeQuestion) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyReviewerState onBack={onBack} />
      </SafeAreaView>
    );
  }

  const resultList = Object.values(answerResults);
  const correctCount = resultList.filter((result) => result.isCorrect).length;
  const scorePercent =
    resultList.length > 0
      ? Math.round(
          resultsMode === 'essay'
            ? resultList.reduce((total, result) => total + result.score, 0) / resultList.length
            : (correctCount / resultList.length) * 100
        )
      : 0;

  return (
    <SafeAreaView edges={[]} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={onBack} style={styles.iconButton}>
          <ChevronLeft size={21} color="#004f4c" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text numberOfLines={1} style={styles.brand}>
            TalinoQ
          </Text>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {reviewer.title}
          </Text>
        </View>
        <View style={styles.iconButton}>
          {savingProgress ? <ActivityIndicator color="#004f4c" size="small" /> : null}
        </View>
      </View>

      {!online ? (
        <View style={styles.offlineBanner}>
          <WifiOff size={17} color="#8a6800" />
          <View style={styles.offlineCopy}>
            <Text style={styles.offlineTitle}>Offline Mode Active</Text>
            <Text style={styles.offlineText}>
              You can keep reviewing. Scores sync when connection returns.
            </Text>
          </View>
        </View>
      ) : null}

      {mode !== 'review' ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.modeRow}>
            {modeTabs.map((tab) => {
              const Icon = tab.icon;
              const active = mode === tab.mode;
              return (
                <TouchableOpacity
                  key={tab.mode}
                  activeOpacity={0.82}
                  onPress={() => switchMode(tab.mode)}
                  style={[styles.modeChip, active && styles.modeChipActive]}>
                  <Icon size={15} color={active ? '#ffffff' : '#004f4c'} />
                  <Text style={[styles.modeText, active && styles.modeTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {mode === 'flashcards' ? 'Card' : 'Question'} {currentIndex + 1} of{' '}
              {activeQuestions.length}
            </Text>
            <Text style={styles.progressLabel}>{Math.round(progressPercent)}% Complete</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` as `${number}%` }]} />
          </View>
        </>
      ) : null}

      {mode === 'review' ? (
        <ResultsView
          correctCount={correctCount}
          onBack={onBack}
          onRetry={retryWeakQuestions}
          onStudyAgain={() => switchMode('flashcards')}
          results={resultList}
          scorePercent={scorePercent}
          total={resultList.length}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {mode === 'quiz' ? (
            <MultipleChoiceCard
              currentResult={currentResult}
              onSelect={setSelectedOptionId}
              onSubmit={submitMultipleChoice}
              question={activeQuestion}
              selectedOptionId={selectedOptionId}
            />
          ) : null}

          {mode === 'typed' ? (
            <TypedAnswerCard
              answer={typedAnswer}
              onChangeAnswer={setTypedAnswer}
              onSubmit={submitTypedAnswer}
              question={activeQuestion}
            />
          ) : null}

          {mode === 'enumeration' ? (
            <EnumerationCard
              answers={enumerationAnswers}
              onChangeAnswers={setEnumerationAnswers}
              onSubmit={submitEnumeration}
              question={activeQuestion}
            />
          ) : null}

          {mode === 'essay' ? (
            <EssayCard
              answer={essayAnswer}
              onChangeAnswer={setEssayAnswer}
              onSubmit={submitEssay}
              question={activeQuestion}
            />
          ) : null}

          {mode === 'flashcards' ? (
            <FlashcardView
              flipped={cardFlipped}
              onFlip={() => setCardFlipped((value) => !value)}
              onMark={markCard}
              question={activeQuestion}
            />
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MultipleChoiceCard({
  currentResult,
  onSelect,
  onSubmit,
  question,
  selectedOptionId,
}: {
  currentResult: AnswerResult | null;
  onSelect: (optionId: string) => void;
  onSubmit: () => void;
  question: ReviewerQuestion;
  selectedOptionId: string | null;
}) {
  return (
    <View style={styles.questionCard}>
      <Text style={styles.questionEyebrow}>{question.type.toUpperCase()}</Text>
      <Text style={styles.questionTitle}>{question.prompt}</Text>

      <View style={styles.optionList}>
        {question.options.map((option, index) => {
          const selected = selectedOptionId === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              activeOpacity={0.86}
              onPress={() => onSelect(option.id)}
              style={[styles.optionButton, selected && styles.optionButtonActive]}>
              <View style={[styles.optionBullet, selected && styles.optionBulletActive]}>
                <Text style={[styles.optionLetter, selected && styles.optionLetterActive]}>
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text style={[styles.optionText, selected && styles.optionTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {currentResult ? <HintCard question={question} /> : null}

      <TouchableOpacity
        activeOpacity={0.88}
        disabled={!selectedOptionId}
        onPress={onSubmit}
        style={[styles.primaryButton, !selectedOptionId && styles.disabledButton]}>
        <Text style={styles.primaryButtonText}>Submit Answer</Text>
      </TouchableOpacity>
    </View>
  );
}

function TypedAnswerCard({
  answer,
  onChangeAnswer,
  onSubmit,
  question,
}: {
  answer: string;
  onChangeAnswer: (answer: string) => void;
  onSubmit: () => void;
  question: ReviewerQuestion;
}) {
  return (
    <View style={styles.questionCard}>
      <Text style={styles.questionEyebrow}>SHORT ANSWER</Text>
      <Text style={styles.questionTitle}>{question.prompt}</Text>
      <TextInput
        multiline
        onChangeText={onChangeAnswer}
        placeholder="Enter answer here..."
        placeholderTextColor="#94a3b8"
        style={styles.answerInput}
        value={answer}
      />
      <TouchableOpacity
        activeOpacity={0.88}
        disabled={!answer.trim()}
        onPress={onSubmit}
        style={[styles.primaryButton, !answer.trim() && styles.disabledButton]}>
        <Text style={styles.primaryButtonText}>Submit Answer</Text>
      </TouchableOpacity>
    </View>
  );
}

function EnumerationCard({
  answers,
  onChangeAnswers,
  onSubmit,
  question,
}: {
  answers: string[];
  onChangeAnswers: (answers: string[]) => void;
  onSubmit: () => void;
  question: ReviewerQuestion;
}) {
  const expectedCount = Math.max(3, Math.min(5, getEnumerationAnswers(question).length));
  const visibleAnswers = Array.from({ length: expectedCount }, (_, index) => answers[index] ?? '');

  return (
    <View style={styles.questionCard}>
      <Text style={styles.questionEyebrow}>ENUMERATION</Text>
      <Text style={styles.questionTitle}>{question.prompt}</Text>
      <View style={styles.enumerationList}>
        {visibleAnswers.map((answer, index) => (
          <View key={index} style={styles.enumerationInputRow}>
            <Text style={styles.enumerationNumber}>{index + 1}.</Text>
            <TextInput
              onChangeText={(value) => {
                const nextAnswers = [...answers];
                nextAnswers[index] = value;
                onChangeAnswers(nextAnswers);
              }}
              placeholder={index === 0 ? 'Enter first item...' : 'Enter next item...'}
              placeholderTextColor="#94a3b8"
              style={styles.enumerationInput}
              value={answer}
            />
          </View>
        ))}
      </View>
      <TouchableOpacity
        activeOpacity={0.88}
        disabled={answers.every((item) => !item.trim())}
        onPress={onSubmit}
        style={[styles.primaryButton, answers.every((item) => !item.trim()) && styles.disabledButton]}>
        <Text style={styles.primaryButtonText}>Validate List</Text>
      </TouchableOpacity>
    </View>
  );
}

function EssayCard({
  answer,
  onChangeAnswer,
  onSubmit,
  question,
}: {
  answer: string;
  onChangeAnswer: (answer: string) => void;
  onSubmit: () => void;
  question: ReviewerQuestion;
}) {
  return (
    <View style={styles.questionCard}>
      <Text style={styles.questionEyebrow}>ESSAY ASSESSMENT</Text>
      <Text style={styles.questionTitle}>Discuss this topic: {question.concept}</Text>
      <TextInput
        multiline
        onChangeText={onChangeAnswer}
        placeholder="Begin your essay here..."
        placeholderTextColor="#94a3b8"
        style={styles.essayInput}
        textAlignVertical="top"
        value={answer}
      />
      <View style={styles.essayFooter}>
        <Text style={styles.characterCount}>{answer.length} / 2000 chars</Text>
        <TouchableOpacity activeOpacity={0.88} onPress={onSubmit} style={styles.primaryButtonInline}>
          <Text style={styles.primaryButtonText}>Submit Essay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FlashcardView({
  flipped,
  onFlip,
  onMark,
  question,
}: {
  flipped: boolean;
  onFlip: () => void;
  onMark: (known: boolean) => void;
  question: ReviewerQuestion;
}) {
  return (
    <View>
      <TouchableOpacity activeOpacity={0.9} onPress={onFlip} style={styles.flashcard}>
        <Text style={styles.flashcardSparkle}>*</Text>
        <Text style={styles.flashcardTitle}>{flipped ? getCorrectAnswer(question) : question.concept}</Text>
        <Text style={styles.flashcardSubtitle}>
          {flipped ? question.explanation : 'Tap to flip'}
        </Text>
      </TouchableOpacity>
      <View style={styles.flashcardActions}>
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => onMark(false)}
          style={[styles.cardActionButton, styles.needReviewButton]}>
          <RotateCcw size={16} color="#ef4444" />
          <Text style={styles.needReviewText}>Need Review</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => onMark(true)}
          style={[styles.cardActionButton, styles.knownButton]}>
          <CheckCircle2 size={16} color="#00a56a" />
          <Text style={styles.knownText}>Known</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ResultsView({
  correctCount,
  onBack,
  onRetry,
  onStudyAgain,
  results,
  scorePercent,
  total,
}: {
  correctCount: number;
  onBack: () => void;
  onRetry: () => void;
  onStudyAgain: () => void;
  results: AnswerResult[];
  scorePercent: number;
  total: number;
}) {
  const weakTopics = Array.from(
    new Set(results.filter((result) => !result.isCorrect).map((result) => result.question.concept))
  ).slice(0, 3);

  return (
    <ScrollView contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
      <View style={styles.scoreCard}>
        <View style={styles.scoreRing}>
          <Text style={styles.scoreValue}>{scorePercent}%</Text>
          <Text style={styles.scoreLabel}>{scorePercent >= 85 ? 'EXPERT' : 'READY'}</Text>
        </View>
        <Text style={styles.resultsTitle}>
          {scorePercent >= 85 ? 'Effortless Mastery!' : 'Review Run Complete'}
        </Text>
        <Text style={styles.resultsText}>
          {scorePercent >= 85
            ? 'You are outperforming this reviewer. Keep the momentum.'
            : 'Your weak topics are ready for another focused pass.'}
        </Text>
      </View>

      <View style={styles.resultStatsRow}>
        <View style={[styles.resultStatCard, styles.correctStat]}>
          <CheckCircle2 size={16} color="#00a56a" />
          <Text style={styles.resultStatTitle}>Correct</Text>
          <Text style={styles.resultStatValue}>
            {correctCount} / {total}
          </Text>
        </View>
        <View style={[styles.resultStatCard, styles.wrongStat]}>
          <XCircle size={16} color="#ef4444" />
          <Text style={styles.resultStatTitle}>Wrong</Text>
          <Text style={styles.resultStatValue}>
            {Math.max(0, total - correctCount)} / {total}
          </Text>
        </View>
      </View>

      {weakTopics.length > 0 ? (
        <View style={styles.weakCard}>
          <Text style={styles.weakTitle}>Weak Topics Detected</Text>
          <Text style={styles.weakText}>{weakTopics.join(', ')}</Text>
        </View>
      ) : null}

      <View style={styles.reviewList}>
        <Text style={styles.reviewListTitle}>Review Answers</Text>
        {results.map((result, index) => (
          <View key={`${result.question.id}-${index}`} style={styles.reviewItem}>
            <Text style={styles.reviewQuestion}>{result.question.prompt}</Text>
            <Text style={styles.reviewAnswer}>Your answer: {result.response || 'Skipped'}</Text>
            <Text style={styles.reviewCorrect}>Correct: {result.correctAnswer}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity activeOpacity={0.88} onPress={onStudyAgain} style={styles.primaryButton}>
        <BookOpen size={17} color="#ffffff" />
        <Text style={styles.primaryButtonText}>Study Flashcards</Text>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.88} onPress={onRetry} style={styles.secondaryButton}>
        <RotateCcw size={17} color="#004f4c" />
        <Text style={styles.secondaryButtonText}>Retry Weak Questions</Text>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.88} onPress={onBack} style={styles.textButton}>
        <Text style={styles.textButtonText}>Back to Reviewers</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function EmptyReviewerState({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <FileText size={40} color="#004f4c" />
      </View>
      <Text style={styles.emptyTitle}>No Questions Yet</Text>
      <Text style={styles.emptyText}>
        This reviewer has no generated items yet. Regenerate it or create another reviewer from your
        learning material.
      </Text>
      <TouchableOpacity activeOpacity={0.88} onPress={onBack} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Back to Reviewers</Text>
      </TouchableOpacity>
    </View>
  );
}

function HintCard({ question }: { question: ReviewerQuestion }) {
  return (
    <View style={styles.hintCard}>
      <Trophy size={17} color="#007a80" />
      <View style={styles.hintCopy}>
        <Text style={styles.hintTitle}>AI Hint</Text>
        <Text style={styles.hintText}>{question.explanation}</Text>
      </View>
    </View>
  );
}

function getCorrectAnswer(question: ReviewerQuestion) {
  return (
    question.options.find((option) => option.isCorrect)?.label ??
    question.options[0]?.label ??
    question.concept
  );
}

function getEnumerationAnswers(question: ReviewerQuestion) {
  const correctOptions = question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.label);

  if (correctOptions.length >= 2) {
    return correctOptions.slice(0, 5);
  }

  return Array.from(
    new Set(
      [question.concept, getCorrectAnswer(question), ...extractKeywords(question.explanation)]
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).slice(0, 5);
}

function normalizeAnswer(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSimilarAnswer(answer: string, expected: string, concept: string) {
  const normalizedAnswer = normalizeAnswer(answer);
  const normalizedExpected = normalizeAnswer(expected);
  const normalizedConcept = normalizeAnswer(concept);

  if (!normalizedAnswer) {
    return false;
  }

  if (
    normalizedAnswer.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedAnswer) ||
    normalizedAnswer.includes(normalizedConcept)
  ) {
    return true;
  }

  const expectedTokens = normalizedExpected.split(' ').filter((token) => token.length > 3);
  const matchedTokens = expectedTokens.filter((token) => normalizedAnswer.includes(token)).length;
  return expectedTokens.length > 0 && matchedTokens / expectedTokens.length >= 0.55;
}

function extractKeywords(value: string) {
  const stopWords = new Set([
    'about',
    'after',
    'also',
    'because',
    'before',
    'between',
    'from',
    'into',
    'that',
    'their',
    'there',
    'these',
    'this',
    'with',
    'your',
  ]);

  return normalizeAnswer(value)
    .split(' ')
    .filter((word) => word.length > 5 && !stopWords.has(word))
    .slice(0, 4);
}

function scoreEssay(answer: string, question: ReviewerQuestion) {
  const wordCount = normalizeAnswer(answer).split(' ').filter(Boolean).length;
  const keywords = [question.concept, getCorrectAnswer(question), ...extractKeywords(question.explanation)];
  const matchedKeywords = keywords.filter((keyword) =>
    normalizeAnswer(answer).includes(normalizeAnswer(keyword))
  ).length;
  const lengthScore = Math.min(45, Math.round((wordCount / 120) * 45));
  const keywordScore = Math.min(45, matchedKeywords * 15);
  return Math.min(100, 10 + lengthScore + keywordScore);
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f7f9ff',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCenter: {
    flex: 1,
  },
  brand: {
    color: '#004f4c',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  offlineBanner: {
    alignItems: 'center',
    backgroundColor: '#fff8dc',
    borderBottomColor: '#f4d35e',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  offlineCopy: {
    flex: 1,
  },
  offlineTitle: {
    color: '#725300',
    fontSize: 12,
    fontWeight: '900',
  },
  offlineText: {
    color: '#725300',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  modeRow: {
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  modeChip: {
    alignItems: 'center',
    backgroundColor: '#eaf6f7',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  modeChipActive: {
    backgroundColor: '#004f4c',
  },
  modeText: {
    color: '#004f4c',
    fontSize: 12,
    fontWeight: '900',
  },
  modeTextActive: {
    color: '#ffffff',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  progressLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
  },
  progressTrack: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    height: 6,
    marginHorizontal: 18,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#007a80',
    borderRadius: 999,
    height: '100%',
  },
  content: {
    padding: 18,
    paddingBottom: 120,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dce8f1',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#002b3a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  questionEyebrow: {
    color: '#007a80',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  questionTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 27,
  },
  optionList: {
    gap: 10,
    marginTop: 18,
  },
  optionButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dce8f1',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 13,
  },
  optionButtonActive: {
    borderColor: '#27c8df',
    borderWidth: 2,
  },
  optionBullet: {
    alignItems: 'center',
    backgroundColor: '#dceeff',
    borderRadius: 999,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  optionBulletActive: {
    backgroundColor: '#27c8df',
  },
  optionLetter: {
    color: '#0b3b75',
    fontSize: 11,
    fontWeight: '900',
  },
  optionLetterActive: {
    color: '#ffffff',
  },
  optionText: {
    color: '#1e293b',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  optionTextActive: {
    color: '#004f4c',
  },
  hintCard: {
    backgroundColor: '#dff8ff',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    padding: 13,
  },
  hintCopy: {
    flex: 1,
  },
  hintTitle: {
    color: '#004f4c',
    fontSize: 13,
    fontWeight: '900',
  },
  hintText: {
    color: '#0f5a65',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },
  answerInput: {
    backgroundColor: '#f8fbff',
    borderColor: '#5b8cff',
    borderRadius: 12,
    borderWidth: 2,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 18,
    minHeight: 84,
    padding: 14,
  },
  enumerationList: {
    gap: 10,
    marginTop: 18,
  },
  enumerationInputRow: {
    alignItems: 'center',
    backgroundColor: '#f8fbff',
    borderColor: '#b6e5d8',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
  },
  enumerationNumber: {
    color: '#004f4c',
    fontSize: 13,
    fontWeight: '900',
  },
  enumerationInput: {
    color: '#0f172a',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    minHeight: 48,
  },
  essayInput: {
    backgroundColor: '#f1f5ff',
    borderColor: '#d1d9e8',
    borderRadius: 12,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 18,
    minHeight: 220,
    padding: 14,
  },
  essayFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  characterCount: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#004f4c',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButtonInline: {
    alignItems: 'center',
    backgroundColor: '#004f4c',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#004f4c',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#004f4c',
    fontSize: 13,
    fontWeight: '900',
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  textButtonText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '900',
  },
  flashcard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dce8f1',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 360,
    padding: 28,
    shadowColor: '#002b3a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  flashcardSparkle: {
    alignSelf: 'flex-end',
    color: '#a4b4c8',
    fontSize: 20,
  },
  flashcardTitle: {
    color: '#004f4c',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    marginTop: 70,
    textAlign: 'center',
  },
  flashcardSubtitle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 90,
    textAlign: 'center',
  },
  flashcardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  cardActionButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
  },
  needReviewButton: {
    backgroundColor: '#ffe7e7',
  },
  knownButton: {
    backgroundColor: '#dfffe9',
  },
  needReviewText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '900',
  },
  knownText: {
    color: '#00a56a',
    fontSize: 12,
    fontWeight: '900',
  },
  resultsContent: {
    padding: 18,
    paddingBottom: 120,
  },
  scoreCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dce8f1',
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
  },
  scoreRing: {
    alignItems: 'center',
    borderColor: '#27c8df',
    borderRadius: 999,
    borderWidth: 8,
    height: 132,
    justifyContent: 'center',
    width: 132,
  },
  scoreValue: {
    color: '#004f4c',
    fontSize: 30,
    fontWeight: '900',
  },
  scoreLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
  },
  resultsTitle: {
    color: '#004f4c',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 18,
    textAlign: 'center',
  },
  resultsText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  resultStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  resultStatCard: {
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  correctStat: {
    backgroundColor: '#f0fff4',
    borderColor: '#b9f4c9',
  },
  wrongStat: {
    backgroundColor: '#fff6f6',
    borderColor: '#ffd1d1',
  },
  resultStatTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  resultStatValue: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  weakCard: {
    backgroundColor: '#e6fff1',
    borderColor: '#c7f3d6',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  weakTitle: {
    color: '#004f4c',
    fontSize: 17,
    fontWeight: '900',
  },
  weakText: {
    color: '#0f5a65',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 5,
  },
  reviewList: {
    gap: 10,
    marginTop: 18,
  },
  reviewListTitle: {
    color: '#020a68',
    fontSize: 18,
    fontWeight: '900',
  },
  reviewItem: {
    backgroundColor: '#ffffff',
    borderColor: '#dce8f1',
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
  },
  reviewQuestion: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  reviewAnswer: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 7,
  },
  reviewCorrect: {
    color: '#004f4c',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#dff8ef',
    borderRadius: 999,
    height: 118,
    justifyContent: 'center',
    width: 118,
  },
  emptyTitle: {
    color: '#004f4c',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 22,
    textAlign: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
});
