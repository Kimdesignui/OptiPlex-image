export interface ProcessedImage {
  blob: Blob;
  url: string;
  size: number;
  width: number;
  height: number;
}

export enum Unit {
  PX = 'px',
  CM = 'cm',
  MM = 'mm'
}

export interface AspectRatio {
  label: string;
  value: number | 'free';
}

export interface CropConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  unit?: Unit;
}

export interface ImageSettings {
  quality: number; // 0 to 1
  scale: number; // 0.1 to 2
  format: 'image/jpeg' | 'image/png' | 'image/webp';
  rotation: number; // degrees
  crop?: CropConfig;
}

export enum AppMode {
  COMPRESS = 'COMPRESS',
  ENHANCE = 'ENHANCE',
}