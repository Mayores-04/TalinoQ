import React from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, History, Plus, X } from 'lucide-react-native';
import { AI_LOGO } from '../../app/pages/aiChat/constants';
import { styles } from '../../app/pages/aiChat/styles';

type AIChatHeaderProps = {
  currentChatTitle: string;
  draftTitle: string;
  isEditingTitle: boolean;
  isFlowActive: boolean;
  onBack?: () => void;
  onBeginTitleEdit: () => void;
  onCancelFlow: () => void;
  onDraftTitleChange: (value: string) => void;
  onOpenHistory: () => void;
  onSaveTitleEdit: () => void;
  onStartNewChat: () => void;
};

export function AIChatHeader({
  currentChatTitle,
  draftTitle,
  isEditingTitle,
  isFlowActive,
  onBack,
  onBeginTitleEdit,
  onCancelFlow,
  onDraftTitleChange,
  onOpenHistory,
  onSaveTitleEdit,
  onStartNewChat,
}: AIChatHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.76}
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        style={styles.headerButton}>
        <ArrowLeft size={22} color="#004f4c" />
      </TouchableOpacity>

      <View style={styles.headerIdentity}>
        <Image source={AI_LOGO} resizeMode="contain" style={styles.headerAvatar} />
        <View style={styles.headerCopy}>
          {isEditingTitle ? (
            <TextInput
              value={draftTitle}
              onChangeText={onDraftTitleChange}
              placeholder="Chat title"
              placeholderTextColor="#94a3b8"
              returnKeyType="done"
              onSubmitEditing={onSaveTitleEdit}
              onBlur={onSaveTitleEdit}
              style={styles.headerTitleInput}
            />
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Edit chat title"
              onPress={onBeginTitleEdit}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {currentChatTitle || 'TalinoQ AI Mentor'}
              </Text>
            </TouchableOpacity>
          )}
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.headerSubtitle}>Scan. Review. Improve.</Text>
          </View>
        </View>
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity
          activeOpacity={0.76}
          accessibilityRole="button"
          accessibilityLabel="New chat"
          onPress={onStartNewChat}
          style={styles.headerMiniButton}>
          <Plus size={18} color="#004f4c" />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.76}
          accessibilityRole="button"
          accessibilityLabel="Chat history"
          onPress={onOpenHistory}
          style={styles.headerMiniButton}>
          <History size={18} color="#004f4c" />
        </TouchableOpacity>
      </View>

      {isFlowActive ? (
        <TouchableOpacity
          activeOpacity={0.76}
          accessibilityRole="button"
          accessibilityLabel="Cancel active AI flow"
          onPress={onCancelFlow}
          style={styles.headerButton}>
          <X size={20} color="#004f4c" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
