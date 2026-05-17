import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  QrCode,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react-native';

type OnboardingScreenProps = {
  onDone: () => void;
};

type OnboardingPageId = 'materials' | 'questions' | 'readiness';

type OnboardingPage = {
  id: OnboardingPageId;
  title: string;
  subtitle: string;
  cta: string;
};

const pages: OnboardingPage[] = [
  {
    id: 'materials',
    title: 'Turn Materials into Reviewers',
    subtitle: 'Scan or upload your notes, handouts, modules, and PDFs.',
    cta: 'Continue',
  },
  {
    id: 'questions',
    title: 'Generate Smart Questions',
    subtitle:
      'Create multiple choice, identification, enumeration, essay, true or false, short answer, and flashcards.',
    cta: 'Continue',
  },
  {
    id: 'readiness',
    title: 'Track Your Exam Readiness',
    subtitle:
      'Monitor scores, weak topics, study streaks, and progress with our AI-powered performance analytics.',
    cta: 'Get Started',
  },
];

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const { width } = useWindowDimensions();
  const page = pages[pageIndex];
  const isLastPage = pageIndex === pages.length - 1;

  const contentWidth = useMemo(() => Math.min(width - 44, 430), [width]);

  const handlePrimaryAction = () => {
    if (isLastPage) {
      onDone();
      return;
    }

    setPageIndex((current) => current + 1);
  };

  return (
    <LinearGradient
      colors={['#f1fcff', '#ffffff', '#f8fbff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Text style={[styles.brandText, page.id !== 'readiness' && styles.hiddenBrand]}>
            TalinoQ
          </Text>

          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            onPress={onDone}
            style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.panel, { width: contentWidth }]}>
            <OnboardingVisual pageId={page.id} />

            <View style={styles.copyBlock}>
              <Text style={styles.title}>{page.title}</Text>
              <Text style={styles.subtitle}>{page.subtitle}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { width: contentWidth }]}>
          <View
            style={styles.dots}
            accessible
            accessibilityLabel={`Onboarding ${pageIndex + 1} of 3`}>
            {pages.map((item, index) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Go to onboarding page ${index + 1}`}
                onPress={() => setPageIndex(index)}
                style={[styles.dot, index === pageIndex && styles.dotActive]}
              />
            ))}
          </View>

          <TouchableOpacity
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={page.cta}
            onPress={handlePrimaryAction}
            style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{page.cta}</Text>
            <ArrowRight size={17} color="#ffffff" strokeWidth={2.6} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function OnboardingVisual({ pageId }: { pageId: OnboardingPageId }) {
  if (pageId === 'questions') {
    return <QuestionsVisual />;
  }

  if (pageId === 'readiness') {
    return <ReadinessVisual />;
  }

  return <MaterialsVisual />;
}

function MaterialsVisual() {
  return (
    <View style={styles.materialsScene}>
      <View style={styles.phoneFrame}>
        <LinearGradient colors={['#18394b', '#102d3d']} style={styles.phoneScreen}>
          <View style={styles.bookBase}>
            <View style={styles.pageLeft} />
            <View style={styles.pageRight} />
            <View style={styles.bookSpine} />
          </View>
          <View style={styles.scanLine} />
          <View style={styles.noteCard}>
            <BookOpenCheck size={34} color="#155e75" strokeWidth={2.3} />
          </View>
        </LinearGradient>
      </View>

      <View style={styles.qrBadge}>
        <QrCode size={15} color="#ffffff" />
        <Text style={styles.qrBadgeText}>OCR Active</Text>
      </View>
    </View>
  );
}

function QuestionsVisual() {
  return (
    <View style={styles.questionsScene}>
      <View style={styles.flashcardTile}>
        <View style={styles.iconCircle}>
          <GraduationCap size={25} color="#064e3b" strokeWidth={2.4} />
        </View>
        <Text style={styles.tileTitle}>Flashcards</Text>
        <Text style={styles.tileSubtitle}>AI-generated memory boosters for active recall.</Text>
      </View>

      <View style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <CheckCircle2 size={14} color="#007a78" fill="#007a78" />
          <Text style={styles.questionHeaderText}>Question 1 of 20</Text>
        </View>
        <View style={styles.questionProgress}>
          <View style={styles.questionProgressFill} />
        </View>
        <Text style={styles.questionText}>What is the capital of France?</Text>
      </View>

      <View style={styles.sparkBadge}>
        <Sparkles size={26} color="#ffffff" fill="#ffffff" />
      </View>

      <View style={styles.trueFalseTile}>
        <Zap size={19} color="#ffffff" />
        <Text style={styles.trueFalseText}>T / F</Text>
      </View>

      <View style={styles.enumTile}>
        <ClipboardList size={18} color="#9f4f3f" />
        <Text style={styles.enumText}>ENUMERATION</Text>
      </View>

      <View style={styles.answerTile}>
        <FileQuestion size={19} color="#ffffff" />
        <View>
          <Text style={styles.answerTitle}>Short Answer</Text>
          <Text style={styles.answerSubtitle}>Deep cognitive evaluation.</Text>
        </View>
      </View>
    </View>
  );
}

function ReadinessVisual() {
  return (
    <View style={styles.readinessScene}>
      <LinearGradient colors={['#123648', '#295e68', '#edf7f8']} style={styles.heroImage}>
        <View style={styles.personHead} />
        <View style={styles.personBody} />
        <View style={styles.armLeft} />
        <View style={styles.armRight} />
        <View style={styles.holoPanelLeft}>
          <View style={styles.holoLineWide} />
          <View style={styles.holoLineShort} />
        </View>
        <View style={styles.holoPanelRight}>
          <View style={styles.holoBar} />
          <View style={[styles.holoBar, styles.holoBarTall]} />
          <View style={styles.holoBar} />
        </View>
      </LinearGradient>

      <View style={styles.readinessBadge}>
        <Text style={styles.readinessPercent}>88%</Text>
        <Text style={styles.readinessText}>Readiness Advanced</Text>
      </View>

      <View style={styles.streakCard}>
        <Target size={16} color="#007a78" />
        <View style={styles.streakCopy}>
          <Text style={styles.streakTitle}>12 Day</Text>
          <Text style={styles.streakSubtitle}>Streak</Text>
          <View style={styles.streakTrack}>
            <View style={styles.streakFill} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 22,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 430,
    paddingTop: 8,
    width: '100%',
  },
  brandText: {
    color: '#005b58',
    fontSize: 18,
    fontWeight: '900',
  },
  hiddenBrand: {
    opacity: 0,
  },
  skipButton: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  skipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 18,
    paddingTop: 10,
  },
  panel: {
    alignItems: 'center',
    gap: 34,
  },
  copyBlock: {
    alignItems: 'center',
    gap: 14,
    maxWidth: 350,
  },
  title: {
    color: '#064e4a',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
    maxWidth: 315,
    textAlign: 'center',
  },
  footer: {
    gap: 20,
    paddingBottom: 24,
  },
  dots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  dot: {
    backgroundColor: '#cbd5e1',
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  dotActive: {
    backgroundColor: '#007a78',
    width: 24,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#007a78',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    height: 58,
    justifyContent: 'center',
    shadowColor: '#064e4a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  materialsScene: {
    alignItems: 'center',
    height: 260,
    justifyContent: 'center',
    width: '100%',
  },
  phoneFrame: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
  },
  phoneScreen: {
    alignItems: 'center',
    borderRadius: 8,
    height: 170,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 138,
  },
  bookBase: {
    height: 54,
    position: 'relative',
    width: 118,
  },
  pageLeft: {
    backgroundColor: '#ecfeff',
    borderColor: '#a7f3d0',
    borderRadius: 5,
    borderWidth: 1,
    height: 44,
    left: 6,
    position: 'absolute',
    top: 8,
    transform: [{ rotate: '-14deg' }],
    width: 58,
  },
  pageRight: {
    backgroundColor: '#ffffff',
    borderColor: '#bae6fd',
    borderRadius: 5,
    borderWidth: 1,
    height: 44,
    position: 'absolute',
    right: 6,
    top: 8,
    transform: [{ rotate: '14deg' }],
    width: 58,
  },
  bookSpine: {
    backgroundColor: '#14b8a6',
    height: 4,
    left: 22,
    position: 'absolute',
    top: 36,
    transform: [{ rotate: '-5deg' }],
    width: 76,
  },
  scanLine: {
    backgroundColor: 'rgba(103, 232, 249, 0.78)',
    height: 3,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 82,
  },
  noteCard: {
    alignItems: 'center',
    backgroundColor: '#99f6e4',
    borderRadius: 5,
    height: 42,
    justifyContent: 'center',
    position: 'absolute',
    top: 54,
    transform: [{ rotate: '-32deg' }],
    width: 54,
  },
  qrBadge: {
    alignItems: 'center',
    backgroundColor: '#006c67',
    borderRadius: 8,
    bottom: 34,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
    position: 'absolute',
    right: 102,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  qrBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  questionsScene: {
    height: 300,
    position: 'relative',
    width: '100%',
  },
  flashcardTile: {
    alignItems: 'center',
    backgroundColor: '#f5f5f4',
    borderRadius: 14,
    height: 164,
    justifyContent: 'center',
    left: 4,
    paddingHorizontal: 16,
    position: 'absolute',
    top: 6,
    width: 132,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#23d66b',
    borderRadius: 999,
    height: 46,
    justifyContent: 'center',
    marginBottom: 20,
    width: 46,
  },
  tileTitle: {
    color: '#00625f',
    fontSize: 17,
    fontWeight: '900',
  },
  tileSubtitle: {
    color: '#475569',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 7,
    textAlign: 'center',
  },
  questionCard: {
    backgroundColor: '#ecfeff',
    borderColor: '#a5ddec',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    position: 'absolute',
    right: 0,
    top: 14,
    width: 178,
  },
  questionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  questionHeaderText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: '900',
  },
  questionProgress: {
    backgroundColor: '#bae6fd',
    borderRadius: 999,
    height: 5,
    marginTop: 10,
    overflow: 'hidden',
  },
  questionProgressFill: {
    backgroundColor: '#007a78',
    height: '100%',
    width: '34%',
  },
  questionText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 10,
  },
  sparkBadge: {
    alignItems: 'center',
    backgroundColor: '#007a78',
    borderRadius: 999,
    height: 68,
    justifyContent: 'center',
    left: 126,
    position: 'absolute',
    top: 134,
    width: 68,
    zIndex: 2,
  },
  trueFalseTile: {
    alignItems: 'center',
    backgroundColor: '#00635f',
    borderRadius: 16,
    gap: 8,
    height: 92,
    justifyContent: 'center',
    left: 174,
    position: 'absolute',
    top: 122,
    width: 74,
  },
  trueFalseText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  enumTile: {
    alignItems: 'center',
    backgroundColor: '#fbf7fb',
    borderColor: '#f0dce8',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    height: 86,
    justifyContent: 'center',
    position: 'absolute',
    right: 2,
    top: 124,
    width: 82,
  },
  enumText: {
    color: '#7f625e',
    fontSize: 8,
    fontWeight: '900',
  },
  answerTile: {
    alignItems: 'center',
    backgroundColor: '#dcecf5',
    borderRadius: 16,
    bottom: 0,
    flexDirection: 'row',
    gap: 14,
    left: 88,
    padding: 18,
    position: 'absolute',
    width: 184,
  },
  answerTitle: {
    color: '#00625f',
    fontSize: 11,
    fontWeight: '900',
  },
  answerSubtitle: {
    color: '#334155',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
    maxWidth: 100,
  },
  readinessScene: {
    height: 292,
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  heroImage: {
    alignSelf: 'center',
    borderRadius: 28,
    height: 242,
    overflow: 'hidden',
    position: 'relative',
    width: '92%',
  },
  personHead: {
    backgroundColor: '#f2b79d',
    borderRadius: 999,
    height: 50,
    left: '46%',
    position: 'absolute',
    top: 60,
    width: 50,
  },
  personBody: {
    backgroundColor: '#0f766e',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    bottom: 0,
    height: 106,
    left: '35%',
    position: 'absolute',
    width: 116,
  },
  armLeft: {
    backgroundColor: '#0f766e',
    borderRadius: 999,
    height: 24,
    left: 58,
    position: 'absolute',
    top: 112,
    transform: [{ rotate: '-28deg' }],
    width: 94,
  },
  armRight: {
    backgroundColor: '#0f766e',
    borderRadius: 999,
    height: 24,
    position: 'absolute',
    right: 44,
    top: 112,
    transform: [{ rotate: '28deg' }],
    width: 92,
  },
  holoPanelLeft: {
    borderColor: 'rgba(125, 211, 252, 0.72)',
    borderRadius: 8,
    borderWidth: 1,
    left: 32,
    padding: 9,
    position: 'absolute',
    top: 88,
    width: 88,
  },
  holoLineWide: {
    backgroundColor: 'rgba(103, 232, 249, 0.9)',
    borderRadius: 999,
    height: 5,
    width: 58,
  },
  holoLineShort: {
    backgroundColor: 'rgba(103, 232, 249, 0.58)',
    borderRadius: 999,
    height: 5,
    marginTop: 8,
    width: 36,
  },
  holoPanelRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    position: 'absolute',
    right: 26,
    top: 78,
  },
  holoBar: {
    backgroundColor: 'rgba(103, 232, 249, 0.72)',
    borderRadius: 999,
    height: 28,
    width: 6,
  },
  holoBarTall: {
    height: 54,
  },
  readinessBadge: {
    alignItems: 'center',
    backgroundColor: '#006c67',
    borderColor: '#8ff5ea',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 9,
    paddingVertical: 8,
    position: 'absolute',
    right: 4,
    top: 18,
  },
  readinessPercent: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  readinessText: {
    color: '#dffdf8',
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 10,
    maxWidth: 56,
  },
  streakCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#8ee7e1',
    borderRadius: 8,
    borderWidth: 1,
    bottom: 10,
    flexDirection: 'row',
    gap: 8,
    left: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'absolute',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
  },
  streakCopy: {
    width: 72,
  },
  streakTitle: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '900',
  },
  streakSubtitle: {
    color: '#0f766e',
    fontSize: 10,
    fontWeight: '800',
  },
  streakTrack: {
    backgroundColor: '#cbd5e1',
    borderRadius: 999,
    height: 5,
    marginTop: 7,
    overflow: 'hidden',
  },
  streakFill: {
    backgroundColor: '#007a78',
    height: '100%',
    width: '72%',
  },
});
