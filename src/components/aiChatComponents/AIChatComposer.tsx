import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Layers3, Paperclip, Send } from 'lucide-react-native';
import { AttachmentPreview } from '@/components/aiChatComponents/AttachmentPreview';
import { PromptChips } from '@/components/aiChatComponents/PromptChips';
import { styles } from '../../app/pages/aiChat/styles';
import type { MaterialPreview } from '@/lib/learningMaterials';

type AIChatComposerProps = {
  activeMaterial: MaterialPreview | null;
  activeOptions: string[];
  bottomPadding: number;
  canSend: boolean;
  createdReviewer: unknown;
  errorMessage: string | null;
  hasConversation: boolean;
  isSending: boolean;
  isUploadingMaterial: boolean;
  message: string;
  onMessageChange: (value: string) => void;
  onOpenReviewers?: () => void;
  onPickMaterial: () => void;
  onRemoveMaterial: () => void;
  onSendMessage: () => void;
  onStepChipPress: (value: string) => void;
};

export function AIChatComposer({
  activeMaterial,
  activeOptions,
  bottomPadding,
  canSend,
  createdReviewer,
  errorMessage,
  hasConversation,
  isSending,
  isUploadingMaterial,
  message,
  onMessageChange,
  onOpenReviewers,
  onPickMaterial,
  onRemoveMaterial,
  onSendMessage,
  onStepChipPress,
}: AIChatComposerProps) {
  return (
    <View style={[styles.composerWrap, { paddingBottom: bottomPadding }]}>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {hasConversation ? <PromptChips prompts={activeOptions} onPress={onStepChipPress} /> : null}

      {createdReviewer ? (
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={onOpenReviewers}
          style={styles.reviewersCta}>
          <Layers3 size={15} color="#004f4c" />
          <Text style={styles.reviewersCtaText}>Open Reviewers</Text>
        </TouchableOpacity>
      ) : null}

      {activeMaterial ? (
        <AttachmentPreview material={activeMaterial} onRemove={onRemoveMaterial} />
      ) : null}

      <View style={styles.composerRow}>
        <TouchableOpacity
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Attach learning material"
          disabled={isUploadingMaterial || isSending}
          onPress={onPickMaterial}
          style={[
            styles.attachButton,
            (isUploadingMaterial || isSending) && styles.attachButtonDisabled,
          ]}>
          {isUploadingMaterial ? (
            <ActivityIndicator color="#004f4c" size="small" />
          ) : (
            <Paperclip size={20} color="#004f4c" />
          )}
        </TouchableOpacity>

        <TextInput
          value={message}
          onChangeText={onMessageChange}
          placeholder="Ask TalinoQ AI to explain, quiz, or create a reviewer..."
          placeholderTextColor="#8da0b3"
          multiline
          maxLength={4000}
          returnKeyType="send"
          style={styles.composer}
          textAlignVertical="center"
        />

        <TouchableOpacity
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={!canSend}
          onPress={onSendMessage}
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}>
          {isSending ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Send size={21} color="#ffffff" fill="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
