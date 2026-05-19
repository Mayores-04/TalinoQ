import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileCheck2, Check, Zap } from 'lucide-react-native';
import { FlowHeader, Tag } from './reviewerCommon';
import { styles } from './reviewerStyles';

export default function ExtractionScreen({
  errorMessage,
  isExtracting,
  summary,
  isGenerating,
  onBack,
  onContinue,
  onRescan,
}: {
  errorMessage?: string | null;
  isExtracting?: boolean;
  summary: {
    characterCount: number;
    detectedSubject: string;
    detectedTopics: string[];
    materialCount: number;
    previewText: string;
    readableCount: number;
    warnings: string[];
  } | null;
  isGenerating?: boolean;
  onBack: () => void;
  onContinue: () => void;
  onRescan: () => void;
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlowHeader title="Extracting Text" subtitle="Review scanned content" onBack={onBack} />
      <ScrollView
        contentContainerStyle={styles.extractionContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.scanHero}>
          <View style={styles.scanRing}>
            <View style={styles.scanIcon}>
              <FileCheck2 size={31} color="#ffffff" />
            </View>
          </View>
          <Text style={styles.scanTitle}>Extracting text...</Text>
          <Text style={styles.scanCopy}>
            TalinoQ is reading saved materials and preparing the real source text for AI.
          </Text>
        </View>

        <View style={styles.statusGrid}>
          <View style={[styles.statusTile, styles.statusTileActive]}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.statusValue}>
              {isExtracting ? 'Scanning Sources' : summary ? 'Ready' : 'Waiting'}
            </Text>
          </View>
          <View style={styles.statusTile}>
            <Text style={styles.statusLabel}>Readable</Text>
            <Text style={styles.statusValue}>
              {summary ? `${summary.readableCount}/${summary.materialCount || 1} source(s)` : '0'}
            </Text>
          </View>
        </View>

        <View style={styles.extractedCard}>
          <View style={styles.extractedTop}>
            <Text style={styles.extractedLabel}>EXTRACTED CONTENT</Text>
            <Text style={styles.characterCount}>
              {(summary?.characterCount ?? 0).toLocaleString()} characters
            </Text>
          </View>
          <Text style={styles.extractedText}>
            {isExtracting
              ? 'Scanning source material...'
              : summary?.previewText ||
                'No readable text yet. Add a PDF, DOCX, image, camera scan, or link first.'}
          </Text>
        </View>

        <Text style={styles.detectedLabel}>AI Detected Subject</Text>
        <View style={styles.detectedCard}>
          {isExtracting ? (
            <ActivityIndicator color="#008c84" size="small" />
          ) : (
            <Check size={18} color="#008c84" />
          )}
          <Text style={styles.detectedText}>{summary?.detectedSubject ?? 'Detecting...'}</Text>
        </View>

        <View style={styles.tagRow}>
          {(summary?.detectedTopics.length ? summary.detectedTopics : ['Source Material']).map(
            (topic) => (
              <Tag key={topic} label={topic} />
            )
          )}
          <TouchableOpacity activeOpacity={0.75} style={styles.addTag}>
            <Text style={styles.addTagText}>+ Add Tag</Text>
          </TouchableOpacity>
        </View>

        {summary?.warnings.map((warning) => (
          <Text key={warning} style={styles.inlineErrorText}>
            {warning}
          </Text>
        ))}
        {errorMessage ? <Text style={styles.inlineErrorText}>{errorMessage}</Text> : null}

        <TouchableOpacity
          activeOpacity={0.86}
          disabled={isGenerating || isExtracting || Boolean(errorMessage)}
          onPress={onContinue}
          style={[
            styles.primaryButton,
            (isGenerating || isExtracting || Boolean(errorMessage)) && styles.disabledButton,
          ]}>
          {isGenerating ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Zap size={15} color="#ffffff" />
          )}
          <Text style={styles.primaryButtonText}>
            {isGenerating ? 'Generating AI Questions...' : 'Continue to Study Guide'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.82}
          disabled={isGenerating}
          onPress={onRescan}
          style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>
            {isGenerating ? 'Please wait...' : 'Re-scan Document'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
