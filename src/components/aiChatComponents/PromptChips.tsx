import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { styles } from '@/app/pages/aiChat/styles';

type PromptChipsProps = {
  prompts: string[];
  onPress: (prompt: string) => void;
};

export function PromptChips({ prompts, onPress }: PromptChipsProps) {
  if (prompts.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.promptRow}>
      {prompts.map((prompt) => (
        <TouchableOpacity
          key={prompt}
          activeOpacity={0.8}
          onPress={() => onPress(prompt)}
          style={styles.promptChip}>
          <Text style={styles.promptText}>{prompt}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
