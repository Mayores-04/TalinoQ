import React, { useEffect, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react-native';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { MaterialPreview } from '@/lib/learningMaterials';
import { AttachmentCard } from './AttachmentCard';
import { styles } from '@/app/pages/aiChat/styles';

type UserMessageProps = {
  attachment?: MaterialPreview;
  canEdit?: boolean;
  isSavingEdit?: boolean;
  onSaveEdit?: (nextContent: string) => Promise<void> | void;
  text: string;
  time: string;
};

export function UserMessage({
  attachment,
  canEdit = false,
  isSavingEdit = false,
  onSaveEdit,
  text,
  time,
}: UserMessageProps) {
  const [draft, setDraft] = useState(text);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(text);
    }
  }, [isEditing, text]);

  async function saveEdit() {
    const nextContent = draft.trim();

    if (!nextContent || !onSaveEdit || nextContent === text.trim()) {
      setIsEditing(false);
      return;
    }

    try {
      await onSaveEdit(nextContent);
      setIsEditing(false);
    } catch {
      // keep editing state so user can retry
    }
  }

  return (
    <View style={styles.userGroup}>
      {attachment ? <AttachmentCard material={attachment} /> : null}
      <View style={styles.userBubble}>
        {isEditing ? (
          <TextInput
            multiline
            value={draft}
            editable={!isSavingEdit}
            onChangeText={setDraft}
            placeholder="Edit your message"
            placeholderTextColor="#b4d7d6"
            style={styles.userEditInput}
          />
        ) : (
          <Text style={styles.userText}>{text}</Text>
        )}
      </View>

      <View style={styles.userMetaRow}>
        <Text style={styles.userMeta}>You - {time}</Text>

        {canEdit ? (
          isEditing ? (
            <View style={styles.userEditActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Save edited message"
                disabled={isSavingEdit}
                onPress={() => {
                  void saveEdit();
                }}
                style={styles.userEditButton}>
                <Check size={14} color="#0f766e" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Cancel message edit"
                disabled={isSavingEdit}
                onPress={() => {
                  setDraft(text);
                  setIsEditing(false);
                }}
                style={styles.userEditButton}>
                <X size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Edit message"
              onPress={() => setIsEditing(true)}
              style={styles.userEditButton}>
              <Pencil size={14} color="#0f766e" />
            </TouchableOpacity>
          )
        ) : null}
      </View>
    </View>
  );
}
