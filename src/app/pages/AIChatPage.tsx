import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bot, Paperclip, Send, Sparkles, Zap } from 'lucide-react-native';

import { askTalinoqMentor, type AiMentorMessage } from '@/lib/aiMentor';

type AIChatPageProps = {
  onBack?: () => void;
  onOpenHome?: () => void;
  onOpenReviewers?: () => void;
  onOpenCreate?: () => void;
  onOpenProgress?: () => void;
};

type ChatMessage = AiMentorMessage & {
  id: string;
  time: string;
  insightTitle?: string;
  insightText?: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      "Hello! I'm your academic AI mentor. Ask me about a topic, reviewer, or weak area and I'll help you study it clearly.",
    time: 'Now',
  },
];

export function AIChatPage({
  onBack,
  onOpenHome: _onOpenHome,
  onOpenReviewers: _onOpenReviewers,
  onOpenCreate: _onOpenCreate,
  onOpenProgress: _onOpenProgress,
}: AIChatPageProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedMessage = message.trim();
  const canSend = trimmedMessage.length > 0 && !isSending;

  async function sendMessage() {
    if (!canSend) {
      return;
    }

    const userMessage = createChatMessage('user', trimmedMessage);
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setMessage('');
    setErrorMessage(null);
    setIsSending(true);

    try {
      const response = await askTalinoqMentor(
        nextMessages.map(({ role, content }) => ({ role, content }))
      );
      setMessages((currentMessages) => [
        ...currentMessages,
        createChatMessage('assistant', response.message),
      ]);
    } catch (error) {
      setErrorMessage(getFriendlyAiError(error));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            style={styles.headerButton}>
            <ArrowLeft size={23} color="#003a70" />
          </TouchableOpacity>

          <View style={styles.headerIdentity}>
            <View style={styles.headerAvatar}>
              <Bot size={20} color="#ffffff" />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>AI Mentor</Text>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.headerSubtitle}>Connected to TalinoQ AI</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityRole="button"
            accessibilityLabel="AI tools"
            style={styles.headerButton}>
            <Zap size={22} color="#003a70" />
          </TouchableOpacity>
        </View>

        <View style={styles.contextBar}>
          <Sparkles size={15} color="#006f6a" />
          <Text style={styles.contextText}>
            Study coaching, reviewer help, and weak-topic fixes
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}>
          {messages.map((chatMessage) =>
            chatMessage.role === 'assistant' ? (
              <MentorMessage
                key={chatMessage.id}
                text={chatMessage.content}
                time={chatMessage.time}
                insightTitle={chatMessage.insightTitle}
                insightText={chatMessage.insightText}
              />
            ) : (
              <UserMessage
                key={chatMessage.id}
                text={chatMessage.content}
                time={chatMessage.time}
              />
            )
          )}

          {isSending ? (
            <View style={styles.typingRow}>
              <View style={styles.avatar}>
                <Bot size={23} color="#ffffff" />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator color="#006f6a" />
                <Text style={styles.typingText}>TalinoQ is thinking...</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.composerWrap}>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.composerRow}>
            <TouchableOpacity activeOpacity={0.78} style={styles.attachButton}>
              <Paperclip size={24} color="#8a99ab" />
            </TouchableOpacity>

            <TextInput
              value={message}
              onChangeText={setMessage}
              onSubmitEditing={sendMessage}
              placeholder="Ask your mentor anything..."
              placeholderTextColor="#9aa8b8"
              returnKeyType="send"
              style={styles.composer}
            />

            <TouchableOpacity
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              disabled={!canSend}
              onPress={sendMessage}
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}>
              {isSending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Send size={23} color="#ffffff" fill="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createChatMessage(role: AiMentorMessage['role'], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    time: formatTime(new Date()),
  };
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFriendlyAiError(error: unknown) {
  const code = readErrorCode(error);

  if (code.includes('not-found')) {
    return 'AI backend is not deployed yet. Deploy Firebase Functions, then try again.';
  }

  if (error instanceof Error) {
    const message = error.message.replace(/^FirebaseError:\s*/i, '').trim();

    if (error.message.toLowerCase().includes('sign in')) {
      return 'Please sign in before using the AI mentor.';
    }

    if (message.toLowerCase().includes('ai proxy url is missing')) {
      return message;
    }

    if (
      message.toLowerCase().includes('groq') ||
      message.toLowerCase().includes('api key') ||
      message.toLowerCase().includes('invalid_api_key') ||
      message.toLowerCase().includes('free groq limit') ||
      message.toLowerCase().includes('model is unavailable') ||
      message.toLowerCase().includes('backend is not deployed')
    ) {
      return message;
    }

    if (message.toLowerCase().includes('firebase')) {
      return message;
    }
  }

  return 'AI mentor is unavailable right now. Please try again in a moment.';
}

function readErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;

    return typeof code === 'string' ? code.toLowerCase() : '';
  }

  return '';
}

function MentorMessage({
  text,
  time,
  insightTitle,
  insightText,
}: {
  text: string;
  time: string;
  insightTitle?: string;
  insightText?: string;
}) {
  return (
    <View style={styles.mentorRow}>
      <View style={styles.avatar}>
        <Bot size={23} color="#ffffff" />
      </View>

      <View style={styles.mentorColumn}>
        <View style={styles.mentorBubble}>
          <Text style={styles.mentorText}>{text}</Text>

          {insightTitle ? (
            <View style={styles.insightBox}>
              <Text style={styles.insightTitle}>{insightTitle}</Text>
              <Text style={styles.insightText}>{insightText}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.mentorMeta}>TalinoQ Mentor - {time}</Text>
      </View>
    </View>
  );
}

function UserMessage({ text, time }: { text: string; time: string }) {
  return (
    <View style={styles.userGroup}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{text}</Text>
      </View>
      <Text style={styles.userMeta}>You - {time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f7f9ff',
    flex: 1,
  },
  keyboardArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#e6edf4',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerIdentity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 11,
  },
  headerAvatar: {
    alignItems: 'center',
    backgroundColor: '#42d8e7',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: '#003a70',
    fontSize: 18,
    fontWeight: '900',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    backgroundColor: '#00a56a',
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  contextBar: {
    alignItems: 'center',
    backgroundColor: '#eefafa',
    borderBottomColor: '#d6eeee',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  contextText: {
    color: '#00625e',
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
  },
  chatContent: {
    backgroundColor: '#faf8ff',
    flexGrow: 1,
    paddingBottom: 118,
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  mentorRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 28,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#42d8e7',
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    marginTop: 1,
    width: 48,
  },
  mentorColumn: {
    flex: 1,
  },
  mentorBubble: {
    backgroundColor: '#ffffff',
    borderColor: '#e8edf4',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#0b2440',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
  },
  mentorText: {
    color: '#243041',
    fontSize: 16,
    lineHeight: 25,
  },
  mentorMeta: {
    color: '#a2a9b8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  userGroup: {
    alignItems: 'flex-end',
    marginBottom: 28,
    paddingLeft: 74,
  },
  userBubble: {
    backgroundColor: '#003a70',
    borderRadius: 8,
    padding: 18,
  },
  userText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 25,
  },
  userMeta: {
    color: '#a2a9b8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  typingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  typingBubble: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e8edf4',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  typingText: {
    color: '#00625e',
    fontSize: 13,
    fontWeight: '800',
  },
  insightBox: {
    backgroundColor: '#e5f4f4',
    borderLeftColor: '#006f6a',
    borderLeftWidth: 5,
    borderRadius: 8,
    marginTop: 18,
    padding: 15,
  },
  insightTitle: {
    color: '#00625e',
    fontSize: 17,
    fontWeight: '900',
  },
  insightText: {
    color: '#506171',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  composerWrap: {
    backgroundColor: '#ffffff',
    borderTopColor: '#edf1f5',
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: 18,
    paddingVertical: 14,
    position: 'absolute',
    right: 0,
  },
  composerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  attachButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 34,
  },
  composer: {
    backgroundColor: '#f4fbfb',
    borderColor: '#d8e8e9',
    borderRadius: 999,
    borderWidth: 1,
    color: '#243041',
    flex: 1,
    fontSize: 15,
    height: 58,
    paddingHorizontal: 26,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#003a70',
    borderRadius: 999,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  sendButtonDisabled: {
    backgroundColor: '#8aa8c6',
  },
  errorText: {
    color: '#c2410c',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
});
