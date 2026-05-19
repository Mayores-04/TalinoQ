import React from 'react';
import { Text, View } from 'react-native';
import { BookOpenCheck } from 'lucide-react-native';
import { getStepLabel } from '../../app/pages/aiChat/helpers';
import { styles } from '../../app/pages/aiChat/styles';
import type { CreationStep } from '../../app/pages/aiChat/types';

type AIChatFlowBarProps = {
  step: CreationStep;
};

export function AIChatFlowBar({ step }: AIChatFlowBarProps) {
  return (
    <View style={styles.flowBar}>
      <View style={styles.flowIcon}>
        <BookOpenCheck size={15} color="#004f4c" />
      </View>
      <View style={styles.flowCopy}>
        <Text style={styles.flowTitle}>Creating reviewer</Text>
        <Text style={styles.flowText}>{getStepLabel(step)}</Text>
      </View>
    </View>
  );
}
