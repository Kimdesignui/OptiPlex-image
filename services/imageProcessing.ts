import { ImageSettings, ProcessedImage } from '../types';

export const processImageClientSide = async (
  file: File,
  settings: ImageSettings
): Promise<ProcessedImage> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // 1. Determine Crop Area (Source)
      const cropX = settings.crop ? settings.crop.x : 0;
      const cropY = settings.crop ? settings.crop.y : 0;
      const cropW = settings.crop ? settings.crop.width : img.width;
      const cropH = settings.crop ? settings.crop.height : img.height;

      // Ensure crop is within bounds (sanity check)
      const safeCropX = Math.max(0, cropX);
      const safeCropY = Math.max(0, cropY);
      const safeCropW = Math.min(cropW, img.width - safeCropX);
      const safeCropH = Math.min(cropH, img.height - safeCropY);

      // 2. Calculate dimensions of the rotated crop
      // We need the bounding box size of the rotated rectangle
      const angleRad = (settings.rotation * Math.PI) / 180;
      const absCos = Math.abs(Math.cos(angleRad));
      const absSin = Math.abs(Math.sin(angleRad));

      const rotatedWidth = safeCropW * absCos + safeCropH * absSin;
      const rotatedHeight = safeCropW * absSin + safeCropH * absCos;

      // 3. Apply Scale to determine final canvas size
      const targetWidth = Math.max(1, Math.floor(rotatedWidth * settings.scale));
      const targetHeight = Math.max(1, Math.floor(rotatedHeight * settings.scale));

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // 4. Draw
      // Move context to center to handle rotation
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate(angleRad);

      // We are drawing the cropped area, centered.
      // The drawing size needs to be scaled.
      const scaledDrawW = safeCropW * settings.scale;
      const scaledDrawH = safeCropH * settings.scale;

      // Draw image
      // Source coords: safeCropX, safeCropY, safeCropW, safeCropH
      // Dest coords: -width/2, -height/2 (relative to rotated center)
      ctx.drawImage(
        img, 
        safeCropX, safeCropY, safeCropW, safeCropH, 
        -scaledDrawW / 2, -scaledDrawH / 2, scaledDrawW, scaledDrawH
      );

      // Export
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob failed'));
            return;
          }
          const url = URL.createObjectURL(blob);
          resolve({
            blob,
            url,
            size: blob.size,
            width: targetWidth,
            height: targetHeight,
          });
        },
        settings.format,
        settings.quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
