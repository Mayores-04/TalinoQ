import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileCheck2, Check, Zap } from 'lucide-react-native';
import { FlowHeader, Tag } from './reviewerCommon';
import { styles } from './reviewerStyles';

export default function ExtractionScreen({ subject, onBack, onContinue, onRescan }: any) {
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
            TalinoQ AI is analyzing your document for key concepts.
          </Text>
        </View>

        <View style={styles.statusGrid}>
          <View style={[styles.statusTile, styles.statusTileActive]}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.statusValue}>Enhancing Image</Text>
          </View>
          <View style={styles.statusTile}>
            <Text style={styles.statusLabel}>OCR Mode</Text>
            <Text style={styles.statusValue}>Neural Mesh</Text>
          </View>
        </View>

        <View style={styles.extractedCard}>
          <View style={styles.extractedTop}>
            <Text style={styles.extractedLabel}>EXTRACTED CONTENT</Text>
            <Text style={styles.characterCount}>1,240 characters</Text>
          </View>
          <Text style={styles.extractedText}>
            The mitochondria is the powerhouse of the cell. It generates most of the chemical energy
            needed to power the cell&apos;s biochemical reactions...
          </Text>
        </View>

        <Text style={styles.detectedLabel}>AI Detected Subject</Text>
        <View style={styles.detectedCard}>
          <Check size={18} color="#008c84" />
          <Text style={styles.detectedText}>{subject || 'Cellular Biology'}</Text>
        </View>

        <View style={styles.tagRow}>
          <Tag label="Biology" />
          <Tag label="Science" />
          <TouchableOpacity activeOpacity={0.75} style={styles.addTag}>
            <Text style={styles.addTagText}>+ Add Tag</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.86} onPress={onContinue} style={styles.primaryButton}>
          <Zap size={15} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Continue to Study Guide</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.82} onPress={onRescan} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Re-scan Document</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
