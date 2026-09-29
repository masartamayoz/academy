/**
 * Cloudinary Signed Upload Service
 * Generates signatures via Backend (Firebase Cloud Function / Server API)
 * Ensures CLOUDINARY_API_SECRET is NEVER present in the browser or frontend.
 */

export interface CloudinarySignedUploadResult {
  secure_url: string;
  public_id: string;
  overwritten: boolean;
  version: number;
}

/**
 * Format public_id according to strict specification:
 * exam -> lesson_${lessonId}_exam
 * correction -> lesson_${lessonId}_correction
 */
export function buildLessonPublicId(lessonId: string | number, docType: 'exam' | 'correction'): string {
  const cleanId = String(lessonId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `lesson_${cleanId}_${docType}`;
}

/**
 * Uploads a PDF to Cloudinary using secure signed upload
 * - resource_type is strictly 'image' to preserve /image/upload/
 * - overwrite: true
 * - invalidate: true
 */
export async function uploadLessonPdfSigned(
  file: File,
  lessonId: string | number,
  docType: 'exam' | 'correction'
): Promise<CloudinarySignedUploadResult> {
  const publicId = buildLessonPublicId(lessonId, docType);

  // 1. Request secure signature from Backend
  const signResponse = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ public_id: publicId }),
  });

  if (!signResponse.ok) {
    const errorData = await signResponse.json().catch(() => ({}));
    throw new Error(errorData.error || `فشل طلب توقيع الرفع الموقّع (${signResponse.status})`);
  }

  const signData = await signResponse.json();
  const { signature, timestamp, apiKey, cloudName } = signData;

  if (!signature || !timestamp || !apiKey || !cloudName) {
    throw new Error('بيانات التوقيع المستلمة من الخادم غير مكتملة');
  }

  // 2. Perform Signed Upload directly to Cloudinary with authorized signature
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', String(apiKey));
  formData.append('timestamp', String(timestamp));
  formData.append('public_id', publicId);
  formData.append('overwrite', 'true');
  formData.append('invalidate', 'true');
  formData.append('signature', signature);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  const uploadResult = await uploadResponse.json();

  if (!uploadResponse.ok || !uploadResult.secure_url) {
    throw new Error(uploadResult.error?.message || 'فشل رفع الملف إلى Cloudinary');
  }

  return {
    secure_url: uploadResult.secure_url,
    public_id: uploadResult.public_id,
    overwritten: !!uploadResult.overwritten,
    version: uploadResult.version,
  };
}
