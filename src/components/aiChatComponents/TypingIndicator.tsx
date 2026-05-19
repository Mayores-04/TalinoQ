import React from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { AI_LOGO } from '@/app/pages/aiChat/constants';
import { styles } from '@/app/pages/aiChat/styles';

export function TypingIndicator() {
  return (
    <View style={styles.mentorRow}>
      <View style={styles.avatarShell}>
        <Image source={AI_LOGO} resizeMode="contain" style={styles.messageAvatar} />
      </View>
      <View style={styles.typingBubble}>
        <ActivityIndicator color="#004f4c" size="small" />
        <Text style={styles.typingText}>TalinoQ is preparing your answer...</Text>
      </View>
    </View>
  );
}
