import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  PanResponder,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Camera,
  FileUp,
  Image as ImageIcon,
  Link2,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import {
  deleteLearningMaterial,
  saveLearningMaterialFileRecord,
  saveLearningMaterialLink,
  subscribeToLearningMaterials,
  updateLearningMaterial,
  type FileMaterialKind,
  type MaterialPreview,
} from '../../../lib/learningMaterials';
import { extractPickedMaterialText } from '@/lib/materialExtraction';
import { extractPdfTextFromRemote } from '@/lib/pdfExtraction';
import { FlowHeader } from './reviewerCommon';
import { styles } from './reviewerStyles';

export default function LearningMaterialsScreen({
  libraryId,
  libraryName,
  onBack,
  onMaterialRemoved,
  onMaterialSaved,
}: {
  libraryId?: string | null;
  libraryName?: string | null;
  onBack: () => void;
  onMaterialRemoved?: (materialId: string) => void;
  onMaterialSaved?: (materialId: string) => void;
}) {
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [materials, setMaterials] = useState<MaterialPreview[]>([]);

  useEffect(() => {
    return subscribeToLearningMaterials(libraryId ?? null, setMaterials);
  }, [libraryId]);

  const pushMaterial = (item: MaterialPreview) => {
    setMaterials((current) => [item, ...current].slice(0, 6));
  };

  const updateMaterial = (id: string, updates: Partial<MaterialPreview>) => {
    setMaterials((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeMaterial = async (item: MaterialPreview) => {
    if (item.status === 'Uploading') {
      Alert.alert('Upload in progress', 'Wait until this material finishes uploading.');
      return;
    }

    setMaterials((current) => current.filter((material) => material.id !== item.id));

    try {
      await deleteLearningMaterial(item.id);
      onMaterialRemoved?.(item.id);
    } catch (error) {
      Alert.alert(
        'Remove failed',
        error instanceof Error ? error.message : 'Please try again in a moment.'
      );
    }
  };

  const uploadAsset = async ({
    uri,
    fileName,
    contentType,
    kind,
    title,
    subtitle,
    fileSize,
  }: {
    uri: string;
    fileName: string;
    contentType?: string;
    kind: FileMaterialKind;
    title: string;
    subtitle: string;
    fileSize?: number;
  }) => {
    const id = `${kind}-${Date.now()}`;
    pushMaterial({ id, kind, title, subtitle, status: 'Uploading', uri });
    setBusy(true);
    try {
      const extraction = await extractPickedMaterialText({
        uri,
        name: fileName,
        mimeType: contentType,
        size: fileSize,
      });
      updateMaterial(id, {
        status: extraction.extractedText ? 'Processing' : 'Uploading',
        subtitle: 'Reading material',
      });
      const savedMaterial = await saveLearningMaterialFileRecord({
        kind,
        title,
        fileName,
        localUri: uri,
        contentType,
        fileSize,
        extractedText: extraction.extractedText,
        libraryId,
        libraryName,
      });
      const remoteExtraction =
        extraction.sourceType === 'pdf' && !extraction.extractedText
          ? await extractPdfTextFromRemote(savedMaterial.remoteUrl)
          : null;
      const extractedText = remoteExtraction?.text || extraction.extractedText;
      const extractionMessage = getReadableExtractionMessage({
        localMessage: extraction.extractionMessage,
        remoteWarning: remoteExtraction?.warning,
        sourceType: extraction.sourceType,
        text: extractedText,
      });

      if (remoteExtraction) {
        await updateLearningMaterial(savedMaterial.id, {
          extractedText,
          status: extractedText ? 'Ready' : 'Saved',
        });
      }

      onMaterialSaved?.(savedMaterial.id);
      updateMaterial(id, {
        extractedText,
        previewUri: savedMaterial.remoteUrl,
        remoteUrl: savedMaterial.remoteUrl,
        sourceType: extraction.sourceType,
        status: extractedText ? 'Ready' : (savedMaterial.status ?? 'Saved'),
        subtitle: extractionMessage,
      });
      Alert.alert(
        'Material added',
        extractedText
          ? 'Your learning material is saved and readable by TalinoQ AI.'
          : extractionMessage
      );
    } catch (error: any) {
      updateMaterial(id, { status: 'Failed', subtitle: 'Upload failed' });
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result: any = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result?.canceled || result?.type === 'cancel') {
        return;
      }

      const asset = result?.assets?.[0] ?? result;
      if (!asset?.uri) {
        throw new Error('No document was selected');
      }

      await uploadAsset({
        uri: asset.uri,
        fileName: asset.name ?? 'document',
        contentType: asset.mimeType,
        fileSize: asset.size,
        kind: 'document',
        title: asset.name ?? 'Document',
        subtitle: 'Document preview',
      });
    } catch (error: any) {
      Alert.alert('Document upload failed', error?.message ?? String(error));
    }
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to attach an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      await uploadAsset({
        uri: asset.uri,
        fileName: asset.fileName ?? `image-${Date.now()}.jpg`,
        contentType: asset.mimeType,
        fileSize: asset.fileSize,
        kind: 'image',
        title: asset.fileName ?? 'Image',
        subtitle: 'Gallery preview',
      });
    } catch (error: any) {
      Alert.alert('Image upload failed', error?.message ?? String(error));
    }
  };

  const openCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow camera access to scan a document.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      await uploadAsset({
        uri: asset.uri,
        fileName: asset.fileName ?? `camera-${Date.now()}.jpg`,
        contentType: asset.mimeType,
        fileSize: asset.fileSize,
        kind: 'camera',
        title: asset.fileName ?? 'Camera capture',
        subtitle: 'Camera preview',
      });
    } catch (error: any) {
      Alert.alert('Camera upload failed', error?.message ?? String(error));
    }
  };

  const saveLink = async () => {
    const trimmedUrl = linkUrl.trim();
    const trimmedTitle = linkTitle.trim();

    if (!trimmedUrl) {
      Alert.alert('Missing link', 'Paste a learning material link first.');
      return;
    }

    setBusy(true);
    try {
      const savedMaterial = await saveLearningMaterialLink(
        trimmedTitle || trimmedUrl,
        trimmedUrl,
        libraryId,
        libraryName
      );
      onMaterialSaved?.(savedMaterial.id);
      pushMaterial({
        id: `link-${Date.now()}`,
        kind: 'link',
        title: trimmedTitle || trimmedUrl,
        subtitle: trimmedUrl,
        status: 'Saved',
        url: trimmedUrl,
      });
      Alert.alert('Link saved', 'Your learning material link was added to the library.');
      setLinkTitle('');
      setLinkUrl('');
    } catch (error: any) {
      Alert.alert('Link save failed', error?.message ?? String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlowHeader
        title="Learning Materials"
        subtitle="Add docs, photos, or links"
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.setupContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.setupTitle}>Add learning materials</Text>
        <Text style={styles.setupCopy}>
          Bring in PDFs, screenshots, camera scans, or links to articles and notes.
        </Text>

        <View style={styles.materialsHero}>
          <Text style={styles.materialsHeroTitle}>Choose how you want to add content</Text>
          <Text style={styles.materialsHeroCopy}>
            You can mix file uploads and link sources in the same reviewer flow.
          </Text>
        </View>

        <View style={styles.materialsGrid}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={pickDocument}
            style={styles.materialsActionCard}>
            <View style={styles.materialsActionIcon}>
              <FileUp size={18} color="#004f4c" />
            </View>
            <Text style={styles.materialsActionTitle}>Upload Document</Text>
            <Text style={styles.materialsActionCopy}>
              Pick PDF, DOCX, or other files from your device.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={openCamera}
            style={[styles.materialsActionCard, styles.materialsActionCardAccent]}>
            <View style={[styles.materialsActionIcon, styles.materialsActionIconAccent]}>
              <Camera size={18} color="#ffffff" />
            </View>
            <Text style={[styles.materialsActionTitle, styles.materialsActionTitleAccent]}>
              Use Camera
            </Text>
            <Text style={[styles.materialsActionCopy, styles.materialsActionCopyAccent]}>
              Capture a page or board note directly with your camera.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={pickImage}
            style={styles.materialsActionCard}>
            <View style={styles.materialsActionIcon}>
              <ImageIcon size={18} color="#004f4c" />
            </View>
            <Text style={styles.materialsActionTitle}>Upload Image</Text>
            <Text style={styles.materialsActionCopy}>
              Attach screenshots, photos, and scan-like images.
            </Text>
          </TouchableOpacity>

          <View style={[styles.materialsActionCard, { justifyContent: 'space-between' }]}>
            <View>
              <View style={styles.materialsActionIcon}>
                <Link2 size={18} color="#004f4c" />
              </View>
              <Text style={styles.materialsActionTitle}>Send Link</Text>
              <Text style={styles.materialsActionCopy}>
                Save a web resource, article, or notes link.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.linkCard}>
          <Text style={styles.sectionTitle}>Link Details</Text>
          <TextInput
            value={linkTitle}
            onChangeText={setLinkTitle}
            placeholder="Link title or label"
            placeholderTextColor="#94a3b8"
            style={[styles.input, { marginTop: 12 }]}
          />
          <TextInput
            autoCapitalize="none"
            keyboardType="url"
            value={linkUrl}
            onChangeText={setLinkUrl}
            placeholder="Paste URL here"
            placeholderTextColor="#94a3b8"
            style={[styles.input, { marginTop: 10 }]}
          />

          <View style={styles.linkActionsRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={saveLink}
              style={[styles.linkButton, { flex: 1 }]}>
              <Sparkles size={15} color="#ffffff" />
              <Text style={styles.linkButtonText}>Save Link</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setLinkTitle('');
                setLinkUrl('');
              }}
              style={[styles.linkButton, styles.linkButtonSecondary]}>
              <Text style={styles.linkButtonTextSecondary}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.materialsPreviewCard}>
          <View style={styles.materialsPreviewHeader}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <Text style={styles.materialsPreviewCount}>{materials.length} item(s)</Text>
          </View>

          {materials.length === 0 ? (
            <View style={styles.materialsPreviewEmpty}>
              <Text style={styles.materialsPreviewEmptyText}>
                Your uploaded materials will appear here with a Cloudinary preview.
              </Text>
            </View>
          ) : (
            <View style={styles.materialsPreviewList}>
              {materials.map((item) => (
                <SwipeableMaterialPreview
                  key={item.id}
                  item={item}
                  onRemove={() => removeMaterial(item)}
                />
              ))}
            </View>
          )}
        </View>

        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color="#004f4c" />
            <Text style={styles.busyText}>Uploading to Cloudinary...</Text>
          </View>
        ) : null}

        <TouchableOpacity activeOpacity={0.86} onPress={onBack} style={styles.primaryButton}>
          <ArrowLeft size={16} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Back to Reviewer Setup</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function getReadableExtractionMessage({
  localMessage,
  remoteWarning,
  sourceType,
  text,
}: {
  localMessage: string;
  remoteWarning?: string;
  sourceType?: string;
  text?: string;
}) {
  if (text?.trim()) {
    return sourceType === 'pdf'
      ? 'I extracted readable text from this PDF.'
      : 'I extracted readable text from this material.';
  }

  if (sourceType === 'pdf' && remoteWarning?.toLowerCase().includes('download')) {
    return 'PDF saved. I could not extract selectable text yet, so try a clearer PDF or paste notes for better AI questions.';
  }

  return (
    remoteWarning ||
    localMessage ||
    'Material saved, but no readable text was extracted from it yet.'
  );
}

function SwipeableMaterialPreview({
  item,
  onRemove,
}: {
  item: MaterialPreview;
  onRemove: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const lastX = useRef(0);

  const open = () => {
    lastX.current = -92;
    Animated.spring(translateX, {
      friction: 8,
      tension: 90,
      toValue: lastX.current,
      useNativeDriver: true,
    }).start();
  };

  const close = () => {
    lastX.current = 0;
    Animated.spring(translateX, {
      friction: 8,
      tension: 90,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        translateX.setValue(Math.min(0, Math.max(-104, lastX.current + gesture.dx)));
      },
      onPanResponderRelease: (_, gesture) => {
        const nextX = lastX.current + gesture.dx;

        if (nextX < -46 || gesture.vx < -0.65) {
          open();
          return;
        }

        close();
      },
      onPanResponderTerminate: close,
    })
  ).current;

  return (
    <View style={styles.materialsSwipeWrap}>
      <TouchableOpacity
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.title}`}
        onPress={onRemove}
        style={styles.materialsDeleteAction}>
        <Trash2 size={18} color="#ffffff" />
        <Text style={styles.materialsDeleteText}>Remove</Text>
      </TouchableOpacity>

      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.materialsPreviewItem, { transform: [{ translateX }] }]}>
        {item.kind === 'image' || item.kind === 'camera' ? (
          item.previewUri ? (
            <Image source={{ uri: item.previewUri }} style={styles.materialsPreviewThumb} />
          ) : (
            <View style={styles.materialsPreviewIconWrap}>
              <ImageIcon size={18} color="#004f4c" />
            </View>
          )
        ) : (
          <View style={styles.materialsPreviewIconWrap}>
            {item.kind === 'link' ? (
              <Link2 size={18} color="#004f4c" />
            ) : (
              <FileUp size={18} color="#004f4c" />
            )}
          </View>
        )}

        <View style={styles.materialsPreviewBody}>
          <Text style={styles.materialsPreviewTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.materialsPreviewMeta} numberOfLines={2}>
            {item.subtitle}
          </Text>
          {item.url || item.remoteUrl ? (
            <Text style={styles.materialsPreviewUrl} numberOfLines={1}>
              {item.url ?? item.remoteUrl}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.materialsPreviewStatus,
            (item.status === 'Saved' || item.status === 'Ready') &&
              styles.materialsPreviewStatusSaved,
            (item.status === 'Uploading' || item.status === 'Processing') &&
              styles.materialsPreviewStatusUploading,
            item.status === 'Failed' && styles.materialsPreviewStatusFailed,
          ]}>
          <Text
            style={[
              styles.materialsPreviewStatusText,
              item.status === 'Failed' && styles.materialsPreviewStatusTextFailed,
            ]}>
            {item.status}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
