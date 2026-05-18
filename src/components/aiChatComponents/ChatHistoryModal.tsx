import React, { useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, Clock3, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react-native';
import type { AiChatRecord } from '@/lib/aiChats';
import { formatChatDate } from '@/app/pages/aiChat/helpers';
import { styles } from '@/app/pages/aiChat/styles';

type ChatHistoryModalProps = {
  chats: AiChatRecord[];
  currentChatId: string | null;
  errorMessage: string | null;
  onClose: () => void;
  onDelete: (chat: AiChatRecord) => void;
  onNewChat: () => void;
  onRename: (chatId: string, title: string) => Promise<void> | void;
  onSelect: (chat: AiChatRecord) => void;
  visible: boolean;
};

export function ChatHistoryModal({
  chats,
  currentChatId,
  errorMessage,
  onClose,
  onDelete,
  onNewChat,
  onRename,
  onSelect,
  visible,
}: ChatHistoryModalProps) {
  const [query, setQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleChats = normalizedQuery
    ? chats.filter(
        (chat) =>
          chat.title.toLowerCase().includes(normalizedQuery) ||
          chat.latestMessage.toLowerCase().includes(normalizedQuery)
      )
    : chats;

  function startEditing(chat: AiChatRecord) {
    setEditingChatId(chat.id);
    setDraftTitle(chat.title);
  }

  function cancelEditing() {
    setEditingChatId(null);
    setDraftTitle('');
  }

  async function saveEditing(chat: AiChatRecord) {
    const nextTitle = draftTitle.trim();

    if (!nextTitle) {
      cancelEditing();
      return;
    }

    if (nextTitle === chat.title) {
      cancelEditing();
      return;
    }

    setIsRenaming(true);
    try {
      await onRename(chat.id, nextTitle);
    } finally {
      setIsRenaming(false);
      cancelEditing();
    }
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.historyBackdrop}>
        <View style={styles.historySheet}>
          <View style={styles.historyHeader}>
            <View>
              <Text style={styles.historyEyebrow}>TalinoQ AI</Text>
              <Text style={styles.historyTitle}>Chat History</Text>
            </View>
            <TouchableOpacity activeOpacity={0.82} onPress={onClose} style={styles.historyClose}>
              <X size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <View style={styles.historyActions}>
            <TouchableOpacity activeOpacity={0.84} onPress={onNewChat} style={styles.historyNew}>
              <Plus size={16} color="#ffffff" />
              <Text style={styles.historyNewText}>New Chat</Text>
            </TouchableOpacity>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search chats"
              placeholderTextColor="#94a3b8"
              style={styles.historySearch}
            />
          </View>

          {errorMessage ? <Text style={styles.historyError}>{errorMessage}</Text> : null}

          {visibleChats.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Sparkles size={24} color="#004f4c" />
              <Text style={styles.historyEmptyTitle}>No AI chats yet</Text>
              <Text style={styles.historyEmptyText}>Start a new chat with your AI Mentor.</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.historyList}>
              {visibleChats.map((chat) => {
                const isEditing = editingChatId === chat.id;

                return (
                  <View
                    key={chat.id}
                    style={[
                      styles.historyItem,
                      currentChatId === chat.id && styles.historyItemActive,
                    ]}>
                    <TouchableOpacity
                      activeOpacity={0.84}
                      onPress={() => onSelect(chat)}
                      disabled={isEditing || isRenaming}
                      style={styles.historyItemMain}>
                      <View style={styles.historyItemIcon}>
                        <Clock3 size={16} color="#004f4c" />
                      </View>
                      <View style={styles.historyItemBody}>
                        {isEditing ? (
                          <TextInput
                            value={draftTitle}
                            onChangeText={setDraftTitle}
                            placeholder="Chat title"
                            placeholderTextColor="#94a3b8"
                            returnKeyType="done"
                            onSubmitEditing={() => saveEditing(chat)}
                            style={styles.historyTitleInput}
                          />
                        ) : (
                          <Text style={styles.historyItemTitle} numberOfLines={1}>
                            {chat.title}
                          </Text>
                        )}
                        <Text style={styles.historyItemPreview} numberOfLines={2}>
                          {chat.latestMessage || 'No messages yet'}
                        </Text>
                        <Text style={styles.historyItemMeta}>
                          {formatChatDate(chat.updatedAt)} - {chat.messageCount} message
                          {chat.messageCount === 1 ? '' : 's'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.historyItemActions}>
                      {isEditing ? (
                        <>
                          <TouchableOpacity
                            activeOpacity={0.78}
                            accessibilityRole="button"
                            accessibilityLabel="Save chat title"
                            onPress={() => saveEditing(chat)}
                            disabled={isRenaming}
                            style={styles.historyDelete}>
                            <Check size={16} color="#0f766e" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            activeOpacity={0.78}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel rename"
                            onPress={cancelEditing}
                            disabled={isRenaming}
                            style={styles.historyDelete}>
                            <X size={16} color="#64748b" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity
                            activeOpacity={0.78}
                            accessibilityRole="button"
                            accessibilityLabel={`Rename ${chat.title}`}
                            onPress={() => startEditing(chat)}
                            style={styles.historyDelete}>
                            <Pencil size={16} color="#0f766e" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            activeOpacity={0.78}
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${chat.title}`}
                            onPress={() => onDelete(chat)}
                            style={styles.historyDelete}>
                            <Trash2 size={16} color="#e11d48" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
