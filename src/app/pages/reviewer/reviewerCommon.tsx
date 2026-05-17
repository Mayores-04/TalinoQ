import React from 'react';
import { Text, TextInput, TouchableOpacity, View, Switch } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { styles } from './reviewerStyles';

export function FlowHeader({
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

export function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} />
    </View>
  );
}

export function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          activeOpacity={0.8}
          onPress={() => onChange(option)}
          style={[styles.segment, value === option && styles.segmentActive]}>
          <Text style={[styles.segmentText, value === option && styles.segmentTextActive]}>
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function Stepper({
  value,
  onMinus,
  onPlus,
}: {
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity activeOpacity={0.78} onPress={onMinus} style={styles.stepButton}>
        <Text style={styles.stepSymbol}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity activeOpacity={0.78} onPress={onPlus} style={styles.stepButton}>
        <Text style={styles.stepSymbol}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

export function ExportToggle({
  label,
  subtitle,
  value,
  onValueChange,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
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

export default {} as any;
