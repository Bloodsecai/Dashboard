// Cloudinary configuration and upload utility
// Uses unsigned uploads (no server-side signature required)

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dadggyeoj';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'sales_crm_unsigned';
const CLOUDINARY_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || 'sales-crm/products';

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Allowed file types
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface CloudinaryError {
  message: string;
  code?: string;
}

/**
 * Validates a file before upload
 * @param file - The file to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: JPG, PNG, WebP`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File too large (${sizeMB}MB). Maximum size is 5MB`,
    };
  }

  return { isValid: true };
}

/**
 * Uploads an image file to Cloudinary using unsigned upload
 * @param file - The image file to upload
 * @returns Promise resolving to the secure URL of the uploaded image
 * @throws Error if upload fails
 */
export async function uploadToCloudinary(file: File): Promise<string> {
  // Validate file first
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Prepare form data for Cloudinary upload
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', CLOUDINARY_FOLDER);

  try {
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || `Upload failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const data: CloudinaryUploadResult = await response.json();

    if (!data.secure_url) {
      throw new Error('No secure URL returned from Cloudinary');
    }

    return data.secure_url;
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw with more context if it's a network error
      if (error.message === 'Failed to fetch') {
        throw new Error('Network error. Please check your internet connection.');
      }
      throw error;
    }
    throw new Error('An unexpected error occurred during upload');
  }
}

/**
 * Creates a local preview URL for a file (for displaying before upload)
 * @param file - The file to create a preview for
 * @returns A blob URL that can be used as an image src
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revokes a previously created preview URL to free memory
 * @param previewUrl - The blob URL to revoke
 */
export function revokeImagePreview(previewUrl: string): void {
  if (previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl);
  }
}
