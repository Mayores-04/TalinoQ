import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { uploadLearningMaterialToCloudinary } from '@/lib/cloudinary';
import { firebaseAuth, firebaseDb } from '@/lib/firebase';

export type MaterialStatus = 'Uploading' | 'Saved' | 'Failed';
export type MaterialKind = 'document' | 'image' | 'camera' | 'link';
export type FileMaterialKind = Exclude<MaterialKind, 'link'>;

export type MaterialPreview = {
  id: string;
  kind: MaterialKind;
  title: string;
  subtitle: string;
  status: MaterialStatus;
  uri?: string;
  previewUri?: string;
  remoteUrl?: string;
  url?: string;
};

function toStatus(value: unknown): MaterialStatus {
  return value === 'Uploading' || value === 'Failed' ? value : 'Saved';
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
  const title = (data.title as string) ?? (data.name as string) ?? 'Material';
  const subtitle =
    (data.url as string) ??
    (data.remoteUrl as string) ??
    (data.name as string) ??
    (data.localUri as string) ??
    'Saved in Firestore';

  return {
    id,
    kind,
    title,
    subtitle,
    status: toStatus(data.status),
    uri: (data.localUri as string) ?? undefined,
    previewUri:
      (data.previewUri as string) ??
      (data.remoteUrl as string) ??
      (data.localUri as string) ??
      undefined,
    remoteUrl: (data.remoteUrl as string) ?? undefined,
    url: (data.url as string) ?? undefined,
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
}: {
  kind: FileMaterialKind;
  title: string;
  fileName: string;
  localUri: string;
  contentType?: string;
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

  try {
    materialRef = await addDoc(materialsCol, {
      kind,
      title: title.trim() || fileName,
      name: fileName,
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
      contentType: contentType ?? null,
      status: 'Saved',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    throw explainFirebaseWriteError(error);
  }

  return {
    id: materialRef.id,
    title: title.trim() || fileName,
    fileName,
    localUri,
    remoteUrl: cloudinaryUpload.secureUrl,
  };
}

export async function saveLearningMaterialLink(title: string, url: string) {
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
      status: 'Saved',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    throw explainFirebaseWriteError(error);
  }

  return { id: materialRef.id, title: trimmedTitle || trimmedUrl, url: trimmedUrl };
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
