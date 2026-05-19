import React from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Info, Search, FileCheck2, Bot, Settings2, Sparkles } from 'lucide-react-native';
import { FlowHeader, Field, SectionTitle, Segmented, Stepper, SummaryRow } from './reviewerCommon';
import { styles } from './reviewerStyles';
import { type LibraryRecord } from '@/lib/libraries';

type SetupScreenProps = {
  category: string;
  categories: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedItems: number;
  libraries: LibraryRecord[];
  guidanceText: string;
  selectedLibraryId: string | null;
  questions: {
    id: string;
    title: string;
    subtitle: string;
    count: number;
  }[];
  subject: string;
  subjects: string[];
  title: string;
  onCategoryChange: (category: string) => void;
  onDifficultyChange: (difficulty: 'Easy' | 'Medium' | 'Hard') => void;
  onLibraryChange: (library: LibraryRecord | null) => void;
  onGenerate: () => void;
  onBack: () => void;
  onQuestionCountChange: (id: string, delta: number) => void;
  onSubjectChange: (subject: string) => void;
  onTitleChange: (title: string) => void;
  onAddDocument: () => void;
};

export default function SetupScreen({
  category,
  categories,
  difficulty,
  estimatedItems,
  libraries,
  guidanceText,
  selectedLibraryId,
  questions,
  subject,
  subjects,
  title,
  onCategoryChange,
  onDifficultyChange,
  onLibraryChange,
  onGenerate,
  onBack,
  onQuestionCountChange,
  onSubjectChange,
  onTitleChange,
  onAddDocument,
}: SetupScreenProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlowHeader title="Reviewer Setup" subtitle="Configure AI reviewer" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.setupContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.setupTitle}>Reviewer Setup</Text>
        <Text style={styles.setupCopy}>
          Configure your AI-powered study material to focus on what matters.
        </Text>

        <SectionTitle icon={<Info size={16} color="#004f4c" />} title="General Information" />
        <Field label="Reviewer Title" value={title} onChangeText={onTitleChange} />

        <Text style={styles.fieldLabel}>Library / Subject Folder</Text>
        <View style={styles.suggestionRow}>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => onLibraryChange(null)}
            style={[styles.suggestionChip, !selectedLibraryId && styles.suggestionChipActive]}>
            <Text
              style={[styles.suggestionText, !selectedLibraryId && styles.suggestionTextActive]}>
              No Library
            </Text>
          </TouchableOpacity>
          {libraries.map((library) => (
            <TouchableOpacity
              key={library.id}
              activeOpacity={0.78}
              onPress={() => onLibraryChange(library)}
              style={[
                styles.suggestionChip,
                selectedLibraryId === library.id && styles.suggestionChipActive,
              ]}>
              <Text
                style={[
                  styles.suggestionText,
                  selectedLibraryId === library.id && styles.suggestionTextActive,
                ]}>
                {library.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Subject</Text>
        <View style={styles.searchField}>
          <Search size={16} color="#64748b" />
          <TextInput
            value={subject}
            onChangeText={onSubjectChange}
            placeholder="Search subject..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>
        <View style={styles.suggestionRow}>
          {subjects.map((item) => (
            <TouchableOpacity
              key={item}
              activeOpacity={0.78}
              onPress={() => onSubjectChange(item)}
              style={[styles.suggestionChip, subject === item && styles.suggestionChipActive]}>
              <Text
                style={[styles.suggestionText, subject === item && styles.suggestionTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          onPress={onAddDocument}
          style={[styles.primaryButton, { marginTop: 12 }]}>
          <FileCheck2 size={16} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Add Learning Materials</Text>
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>Folder / Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map((item) => (
            <TouchableOpacity
              key={item}
              activeOpacity={0.8}
              onPress={() => onCategoryChange(item)}
              style={[styles.categoryChip, category === item && styles.categoryChipActive]}>
              <Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionTitle icon={<Bot size={16} color="#004f4c" />} title="Cognitive Depth" />
        <Segmented
          options={['Easy', 'Medium', 'Hard']}
          value={difficulty}
          onChange={(v: string) => onDifficultyChange(v as 'Easy' | 'Medium' | 'Hard')}
        />

        <SectionTitle
          icon={<Settings2 size={16} color="#004f4c" />}
          title="Question Configuration"
        />
        <View style={styles.configList}>
          {questions.map((item: any) => (
            <View key={item.id} style={styles.configRow}>
              <View style={styles.configText}>
                <Text style={styles.configTitle}>{item.title}</Text>
                <Text style={styles.configSubtitle}>{item.subtitle}</Text>
              </View>
              <Stepper
                value={item.count}
                onMinus={() => onQuestionCountChange(item.id, -5)}
                onPlus={() => onQuestionCountChange(item.id, 5)}
              />
            </View>
          ))}
        </View>

        <View style={styles.guidanceCard}>
          <View style={styles.guidanceHeader}>
            <Bot size={17} color="#dffcf9" />
            <Text style={styles.guidanceTitle}>AI Guidance</Text>
          </View>
          <Text style={styles.guidanceText}>
            {guidanceText}
          </Text>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => onQuestionCountChange('identification', 10)}
            style={styles.guidanceButton}>
            <Text style={styles.guidanceButtonText}>Apply Optimized Mix</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.compositionLabel}>Reviewer Composition</Text>
        <View style={styles.compositionCard}>
          <SummaryRow label="Estimated Items" value={`${estimatedItems}`} />
          <SummaryRow label="Difficulty Level" value={difficulty} />
        </View>

        <TouchableOpacity activeOpacity={0.86} onPress={onGenerate} style={styles.primaryButton}>
          <Sparkles size={16} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Generate Reviewer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
