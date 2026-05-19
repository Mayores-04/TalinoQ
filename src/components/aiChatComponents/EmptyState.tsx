import React from 'react';
import { Image, Text, View } from 'react-native';
import { AI_LOGO } from '@/app/pages/aiChat/constants';
import { styles } from '@/app/pages/aiChat/styles';
import { PromptChips } from './PromptChips';

type EmptyStateProps = {
  onSuggestion: (prompt: string) => void;
  prompts: string[];
};

export function EmptyState({ onSuggestion, prompts }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <Image source={AI_LOGO} resizeMode="contain" style={styles.emptyLogo} />
      <Text style={styles.emptyTitle}>Ask TalinoQ AI anything</Text>
      <Text style={styles.emptyText}>
        Explain topics, quiz yourself, improve a reviewer, or create a full reviewer through chat.
      </Text>
      <PromptChips prompts={prompts} onPress={onSuggestion} />
    </View>
  );
}
