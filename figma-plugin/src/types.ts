import { EventHandler } from "@create-figma-plugin/utilities";

export interface InsertCodeHandler extends EventHandler {
  name: "INSERT_CODE";
  handler: (code: string) => void;
}

export interface ImageData {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  id?: string;
  type?: string;
  base64?: string;
  service?: string;
  addedAt?: string;
}

export interface SaveImagesHandler extends EventHandler {
  name: "SAVE_IMAGES";
  handler: (images: ImageData[]) => void;
}

export interface LoadImagesHandler extends EventHandler {
  name: "LOAD_IMAGES";
  handler: () => void;
}

export interface ImagesLoadedHandler extends EventHandler {
  name: "IMAGES_LOADED";
  handler: (images: ImageData[]) => void;
}
