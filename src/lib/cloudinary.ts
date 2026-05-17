export type CloudinaryUploadResourceType = 'image' | 'video' | 'raw';

export type CloudinaryUploadResult = {
  bytes?: number;
  format?: string;
  originalFilename?: string;
  publicId: string;
  resourceType: CloudinaryUploadResourceType;
  secureUrl: string;
};

const fallbackCloudName = 'dqqcdkx83';
const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() || fallbackCloudName;
const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim() || 'talinoq_unsigned';

function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getResourceType(value: unknown): CloudinaryUploadResourceType {
  return value === 'video' || value === 'raw' ? value : 'image';
}

function getCloudinaryErrorMessage(payload: unknown) {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: { message?: unknown } }).error;
    const message = readString(error?.message);

    if (message) {
      if (message.toLowerCase().includes('upload preset')) {
        return `Cloudinary upload preset "${uploadPreset}" is not ready. Create it as an unsigned upload preset in Cloudinary, then restart the app.`;
      }

      return message;
    }
  }

  return 'Cloudinary upload failed.';
}

export function getCloudinaryConfigStatus() {
  return {
    cloudName,
    hasUploadPreset: Boolean(uploadPreset),
  };
}

export async function uploadLearningMaterialToCloudinary({
  contentType,
  fileName,
  folder,
  uri,
}: {
  contentType?: string;
  fileName: string;
  folder: string;
  uri: string;
}) {
  if (!cloudName) {
    throw new Error('Cloudinary cloud name is missing.');
  }

  if (!uploadPreset) {
    throw new Error(
      'Cloudinary upload preset is missing. Add EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET with an unsigned upload preset.'
    );
  }

  const formData = new FormData();

  formData.append('file', {
    name: fileName,
    type: contentType ?? 'application/octet-stream',
    uri,
  } as unknown as Blob);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    body: formData,
    method: 'POST',
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(getCloudinaryErrorMessage(payload));
  }

  const secureUrl = readString(payload.secure_url);
  const publicId = readString(payload.public_id);

  if (!secureUrl || !publicId) {
    throw new Error('Cloudinary upload succeeded but did not return a usable file URL.');
  }

  return {
    bytes: readNumber(payload.bytes),
    format: readString(payload.format) || undefined,
    originalFilename: readString(payload.original_filename) || fileName,
    publicId,
    resourceType: getResourceType(payload.resource_type),
    secureUrl,
  } satisfies CloudinaryUploadResult;
}
