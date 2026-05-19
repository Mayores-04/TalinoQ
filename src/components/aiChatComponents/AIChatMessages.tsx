import React, { useRef } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { EmptyState } from '@/components/aiChatComponents/EmptyState';
import { MentorMessage } from '@/components/aiChatComponents/MentorMessage';
import { TypingIndicator } from '@/components/aiChatComponents/TypingIndicator';
import { UserMessage } from '@/components/aiChatComponents/UserMessage';
import { promptSuggestions } from '../../app/pages/aiChat/constants';
import { styles } from '../../app/pages/aiChat/styles';
import type { ChatMessage } from '../../app/pages/aiChat/types';

type AIChatMessagesProps = {
  editingMessageId: string | null;
  hasConversation: boolean;
  isSending: boolean;
  loading: boolean;
  messages: ChatMessage[];
  onEditUserMessage: (messageId: string, nextContent: string) => Promise<void> | void;
  onSuggestion: (prompt: string) => void;
  paddingBottom: number;
};

export function AIChatMessages({
  editingMessageId,
  hasConversation,
  isSending,
  loading,
  messages,
  onEditUserMessage,
  onSuggestion,
  paddingBottom,
}: AIChatMessagesProps) {
  const scrollRef = useRef<ScrollView | null>(null);

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[styles.chatContent, { paddingBottom }]}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      showsVerticalScrollIndicator={false}>
      {loading ? (
        <View style={styles.loadingHistoryCard}>
          <ActivityIndicator color="#004f4c" />
          <Text style={styles.loadingHistoryText}>Loading saved chat...</Text>
        </View>
      ) : null}

      {!hasConversation ? (
        <EmptyState onSuggestion={onSuggestion} prompts={promptSuggestions} />
      ) : null}

      {messages.map((chatMessage) =>
        chatMessage.role === 'assistant' ? (
          <MentorMessage
            key={chatMessage.id}
            text={chatMessage.content}
            time={chatMessage.time}
            tone={chatMessage.tone}
          />
        ) : (
          <UserMessage
            key={chatMessage.id}
            attachment={chatMessage.attachment}
            canEdit={!chatMessage.attachment && !loading && !isSending}
            isSavingEdit={editingMessageId === chatMessage.id}
            onSaveEdit={(nextContent) => onEditUserMessage(chatMessage.id, nextContent)}
            text={chatMessage.content}
            time={chatMessage.time}
          />
        )
      )}

      {isSending ? <TypingIndicator /> : null}
    </ScrollView>
  );
}
