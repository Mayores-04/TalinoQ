import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import type { MaterialPreview } from '@/lib/learningMaterials';
import { styles } from '@/app/pages/aiChat/styles';

type AttachmentPreviewProps = {
  material: MaterialPreview;
  onRemove: () => void;
};

export function AttachmentPreview({ material, onRemove }: AttachmentPreviewProps) {
  return (
    <View style={styles.attachmentPreview}>
      <View style={styles.attachmentInfo}>
        <Text style={styles.attachmentPreviewTitle} numberOfLines={1}>
          {material.title}
        </Text>
        <Text style={styles.attachmentPreviewSubtitle} numberOfLines={1}>
          {material.subtitle}
        </Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Remove attachment"
        onPress={onRemove}
        style={styles.attachmentRemove}>
        <X size={18} color="#64748b" />
      </TouchableOpacity>
    </View>
  );
}
