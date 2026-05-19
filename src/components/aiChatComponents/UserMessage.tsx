import React from 'react';
import { Text, View } from 'react-native';
import type { MaterialPreview } from '@/lib/learningMaterials';
import { AttachmentCard } from './AttachmentCard';
import { styles } from '@/app/pages/aiChat/styles';

type UserMessageProps = {
  attachment?: MaterialPreview;
  text: string;
  time: string;
};

export function UserMessage({ attachment, text, time }: UserMessageProps) {
  return (
    <View style={styles.userGroup}>
      {attachment ? <AttachmentCard material={attachment} /> : null}
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{text}</Text>
      </View>
      <Text style={styles.userMeta}>You - {time}</Text>
    </View>
  );
}
