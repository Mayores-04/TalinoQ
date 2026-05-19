import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { uploadLearningMaterialToCloudinary } from '@/lib/cloudinary';
import { firebaseAuth, firebaseDb } from '@/lib/firebase';

export type MaterialStatus = 'Uploading' | 'Processing' | 'Ready' | 'Saved' | 'Failed';
export type MaterialKind = 'document' | 'image' | 'camera' | 'link';
export type FileMaterialKind = Exclude<MaterialKind, 'link'>;
export type MaterialSourceType = 'docx' | 'pdf' | 'image' | 'link' | 'unknown';

export type MaterialPreview = {
  id: string;
  kind: MaterialKind;
  title: string;
  subtitle: string;
  status: MaterialStatus;
  fileName?: string;
  fileType?: string;
  mimeType?: string;
  fileSize?: number;
  fileUrl?: string;
  libraryId?: string | null;
  libraryName?: string | null;
  extractedText?: string;
  summary?: string;
  sourceType?: MaterialSourceType;
  uri?: string;
  previewUri?: string;
  remoteUrl?: string;
  url?: string;
};

function toStatus(value: unknown): MaterialStatus {
  if (
    value === 'Uploading' ||
    value === 'Processing' ||
    value === 'Ready' ||
    value === 'Saved' ||
    value === 'Failed'
  ) {
    return value;
  }

  return 'Saved';
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toSourceType(value: unknown, mimeType?: string, fileName?: string): MaterialSourceType {
  if (value === 'docx' || value === 'pdf' || value === 'image' || value === 'link') {
    return value;
  }

  const lowerMime = mimeType?.toLowerCase() ?? '';
  const lowerName = fileName?.toLowerCase() ?? '';

  if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) {
    return 'pdf';
  }

  if (lowerMime.includes('wordprocessingml') || lowerName.endsWith('.docx')) {
    return 'docx';
  }

  if (lowerMime.startsWith('image/') || /\.(jpg|jpeg|png|heic)$/i.test(lowerName)) {
    return 'image';
  }

  return 'unknown';
}

async function getMaterialUserId() {
  const currentUser = firebaseAuth?.currentUser;

  if (currentUser) {
    return currentUser.uid;
  }

  if (!firebaseAuth) {
    throw new Error('Firebase auth is not initialized');
  }

  throw new Error('Sign in again before adding learning materials.');
}

function mapMaterialPreview(id: string, data: Record<string, unknown>): MaterialPreview {
  const kind = (data.kind as MaterialKind) ?? 'document';
  const fileName = readString(data.fileName, readString(data.name, ''));
  const mimeType = readString(data.mimeType, readString(data.contentType, ''));
  const fileUrl = readString(data.fileUrl, readString(data.remoteUrl, readString(data.url, '')));
  const title = readString(data.title, fileName || 'Material');
  const subtitle =
    readString(data.url) ||
    readString(data.remoteUrl) ||
    fileName ||
    readString(data.localUri) ||
    'Saved in Firestore';

  return {
    id,
    kind,
    title,
    subtitle,
    status: toStatus(data.status),
    fileName: fileName || undefined,
    fileType: readString(data.fileType, mimeType || undefined),
    mimeType: mimeType || undefined,
    fileSize: readNumber(data.fileSize),
    fileUrl: fileUrl || undefined,
    libraryId: readNullableString(data.libraryId),
    libraryName: readNullableString(data.libraryName),
    extractedText: readString(data.extractedText) || undefined,
    summary: readString(data.summary) || undefined,
    sourceType: toSourceType(data.sourceType, mimeType, fileName),
    uri: readString(data.localUri) || undefined,
    previewUri:
      readString(data.previewUri) ||
      readString(data.remoteUrl) ||
      readString(data.localUri) ||
      undefined,
    remoteUrl: readString(data.remoteUrl) || undefined,
    url: readString(data.url) || undefined,
  };
}

function explainFirebaseWriteError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  if (code === 'permission-denied' || message.toLowerCase().includes('insufficient permissions')) {
    return new Error(
      'Firebase denied this save. Deploy the latest Firestore rules, then try again.'
    );
  }

  return error;
}

export function subscribeToLearningMaterials(
  onMaterials: (materials: MaterialPreview[]) => void,
  onError?: () => void
) {
  const userId = firebaseAuth?.currentUser?.uid;

  if (!firebaseDb || !userId) {
    onMaterials([]);
    return () => {};
  }

  const materialsQuery = query(
    collection(firebaseDb, 'users', userId, 'learningMaterials'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    materialsQuery,
    (snapshot) => {
      onMaterials(
        snapshot.docs.map((documentSnapshot) =>
          mapMaterialPreview(
            documentSnapshot.id,
            documentSnapshot.data() as Record<string, unknown>
          )
        )
      );
    },
    () => {
      onError?.();
    }
  );
}

export async function saveLearningMaterialFileRecord({
  kind,
  title,
  fileName,
  localUri,
  contentType,
  fileSize,
  extractedText,
  libraryId,
  libraryName,
}: {
  kind: FileMaterialKind;
  title: string;
  fileName: string;
  localUri: string;
  contentType?: string;
  fileSize?: number;
  extractedText?: string;
  libraryId?: string | null;
  libraryName?: string | null;
}) {
  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  const userId = await getMaterialUserId();
  const cloudinaryUpload = await uploadLearningMaterialToCloudinary({
    contentType,
    fileName,
    folder: `talinoq/${userId}/learning-materials`,
    uri: localUri,
  });

  const materialsCol = collection(firebaseDb, 'users', userId, 'learningMaterials');
  let materialRef;
  const sourceType = toSourceType(undefined, contentType, fileName);
  const uploadStatus: MaterialStatus = extractedText?.trim() ? 'Ready' : 'Saved';

  try {
    materialRef = await addDoc(materialsCol, {
      kind,
      title: title.trim() || fileName,
      name: fileName,
      fileName,
      fileType: contentType ?? sourceType,
      fileSize: fileSize ?? cloudinaryUpload.bytes ?? null,
      fileUrl: cloudinaryUpload.secureUrl,
      mimeType: contentType ?? null,
      localUri,
      previewUri: cloudinaryUpload.secureUrl,
      remoteUrl: cloudinaryUpload.secureUrl,
      cloudinary: {
        bytes: cloudinaryUpload.bytes ?? null,
        format: cloudinaryUpload.format ?? null,
        originalFilename: cloudinaryUpload.originalFilename ?? fileName,
        publicId: cloudinaryUpload.publicId,
        resourceType: cloudinaryUpload.resourceType,
        secureUrl: cloudinaryUpload.secureUrl,
      },
      extractedText: extractedText?.trim() ?? '',
      libraryId: libraryId ?? null,
      libraryName: libraryName ?? null,
      sourceType,
      contentType: contentType ?? null,
      status: uploadStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw explainFirebaseWriteError(error);
  }

  return {
    id: materialRef.id,
    kind,
    title: title.trim() || fileName,
    fileName,
    fileSize: fileSize ?? cloudinaryUpload.bytes,
    fileType: contentType ?? sourceType,
    fileUrl: cloudinaryUpload.secureUrl,
    mimeType: contentType,
    localUri,
    remoteUrl: cloudinaryUpload.secureUrl,
    status: uploadStatus,
    sourceType,
  } satisfies Partial<MaterialPreview> & {
    id: string;
    title: string;
    fileName: string;
    localUri: string;
    remoteUrl: string;
  };
}

export async function saveLearningMaterialLink(
  title: string,
  url: string,
  libraryId?: string | null,
  libraryName?: string | null
) {
  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  const userId = await getMaterialUserId();

  const trimmedTitle = title.trim();
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    throw new Error('A learning material link is required');
  }

  const materialsCol = collection(firebaseDb, 'users', userId, 'learningMaterials');
  let materialRef;

  try {
    materialRef = await addDoc(materialsCol, {
      kind: 'link',
      title: trimmedTitle || trimmedUrl,
      url: trimmedUrl,
      fileUrl: trimmedUrl,
      libraryId: libraryId ?? null,
      libraryName: libraryName ?? null,
      sourceType: 'link',
      status: 'Ready',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw explainFirebaseWriteError(error);
  }

  return { id: materialRef.id, title: trimmedTitle || trimmedUrl, url: trimmedUrl };
}

export async function updateLearningMaterial(
  materialId: string,
  updates: Partial<
    Pick<
      MaterialPreview,
      'libraryId' | 'libraryName' | 'extractedText' | 'summary' | 'status' | 'title' | 'subtitle'
    >
  >
) {
  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  const userId = await getMaterialUserId();
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if ('libraryId' in updates) payload.libraryId = updates.libraryId ?? null;
  if ('libraryName' in updates) payload.libraryName = updates.libraryName ?? null;
  if ('extractedText' in updates) payload.extractedText = updates.extractedText ?? '';
  if ('summary' in updates) payload.summary = updates.summary ?? '';
  if ('status' in updates) payload.status = updates.status ?? 'Saved';
  if ('title' in updates && updates.title) payload.title = updates.title;
  if ('subtitle' in updates && updates.subtitle) payload.subtitle = updates.subtitle;

  try {
    await updateDoc(doc(firebaseDb, 'users', userId, 'learningMaterials', materialId), payload);
  } catch (error) {
    throw explainFirebaseWriteError(error);
  }
}

export async function fetchLearningMaterialsByLibrary(libraryId: string) {
  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  const userId = await getMaterialUserId();
  const snapshot = await getDocs(
    query(
      collection(firebaseDb, 'users', userId, 'learningMaterials'),
      where('libraryId', '==', libraryId)
    )
  );

  return snapshot.docs.map((documentSnapshot) =>
    mapMaterialPreview(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
  );
}

export async function deleteLearningMaterial(materialId: string) {
  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  const userId = await getMaterialUserId();

  try {
    await deleteDoc(doc(firebaseDb, 'users', userId, 'learningMaterials', materialId));
  } catch (error) {
    throw explainFirebaseWriteError(error);
  }
}

export async function fetchLearningMaterialsByIds(materialIds: string[]) {
  if (!firebaseDb) {
    throw new Error('Firebase database is not initialized');
  }

  const db = firebaseDb;
  const userId = await getMaterialUserId();
  const uniqueIds = Array.from(new Set(materialIds)).filter(Boolean);
  const materials = await Promise.all(
    uniqueIds.map(async (materialId) => {
      const snapshot = await getDoc(doc(db, 'users', userId, 'learningMaterials', materialId));

      return snapshot.exists()
        ? mapMaterialPreview(snapshot.id, snapshot.data() as Record<string, unknown>)
        : null;
    })
  );

  return materials.filter((material): material is MaterialPreview => Boolean(material));
}
