import React from 'react';
import { Image, Text, View } from 'react-native';
import { AI_LOGO } from '@/app/pages/aiChat/constants';
import { styles } from '@/app/pages/aiChat/styles';
import type { ChatMessage } from '@/app/pages/aiChat/types';

type MentorMessageProps = {
  text: string;
  time: string;
  tone?: ChatMessage['tone'];
};

export function MentorMessage({ text, time, tone }: MentorMessageProps) {
  return (
    <View style={styles.mentorRow}>
      <View style={styles.avatarShell}>
        <Image source={AI_LOGO} resizeMode="contain" style={styles.messageAvatar} />
      </View>

      <View style={styles.mentorColumn}>
        <View
          style={[
            styles.mentorBubble,
            tone === 'success' && styles.mentorBubbleSuccess,
            tone === 'warning' && styles.mentorBubbleWarning,
          ]}>
          <Text style={styles.mentorText}>{text}</Text>
        </View>

        <Text style={styles.mentorMeta}>TalinoQ AI - {time}</Text>
      </View>
    </View>
  );
}
