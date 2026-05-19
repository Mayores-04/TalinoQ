import React from 'react';
import { Text, View } from 'react-native';
import { FileUp, Image as ImageIcon } from 'lucide-react-native';
import { formatFileSize } from '@/lib/materialExtraction';
import type { MaterialPreview } from '@/lib/learningMaterials';
import { styles } from '@/app/pages/aiChat/styles';

type AttachmentCardProps = {
  material: MaterialPreview;
};

export function AttachmentCard({ material }: AttachmentCardProps) {
  const isImage =
    material.sourceType === 'image' || material.kind === 'image' || material.kind === 'camera';

  return (
    <View style={styles.attachmentCard}>
      <View style={styles.attachmentIcon}>
        {isImage ? <ImageIcon size={18} color="#004f4c" /> : <FileUp size={18} color="#004f4c" />}
      </View>
      <View style={styles.attachmentBody}>
        <Text style={styles.attachmentTitle} numberOfLines={1}>
          {material.fileName ?? material.title}
        </Text>
        <Text style={styles.attachmentMeta} numberOfLines={1}>
          {(material.sourceType ?? 'file').toUpperCase()} - {formatFileSize(material.fileSize)}
        </Text>
        {material.libraryName ? (
          <Text style={styles.attachmentLibrary} numberOfLines={1}>
            Saved to {material.libraryName}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.attachmentStatus,
          material.status === 'Failed' && styles.attachmentStatusFailed,
          (material.status === 'Ready' || material.status === 'Saved') &&
            styles.attachmentStatusReady,
        ]}>
        <Text
          style={[
            styles.attachmentStatusText,
            material.status === 'Failed' && styles.attachmentStatusTextFailed,
          ]}>
          {material.status}
        </Text>
      </View>
    </View>
  );
}
