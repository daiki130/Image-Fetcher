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
  favicon?: string; // ページから取得したfaviconのURL
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

export interface GetSavedImagesHandler extends EventHandler {
  name: "GET_SAVED_IMAGES";
  handler: () => void;
}

export interface SavedImagesRetrievedHandler extends EventHandler {
  name: "SAVED_IMAGES_RETRIEVED";
  handler: (images: ImageData[]) => void;
}

export interface PlaceImagesInFrameHandler extends EventHandler {
  name: "PLACE_IMAGES_IN_FRAME";
  handler: (data: {
    images: Array<{ imageData: Uint8Array; width: number; height: number }>;
    matchAspectRatio?: boolean;
  }) => void;
}

export interface ApplyDummyTextToSelectionHandler extends EventHandler {
  name: "APPLY_DUMMY_TEXT_TO_SELECTION";
  handler: (data: { dummyTextTemplate: string }) => void;
}

export interface PlaceRandomContentInFrameHandler extends EventHandler {
  name: "PLACE_RANDOM_CONTENT_IN_FRAME";
  handler: (data: {
    images: Array<{ imageData: Uint8Array; width: number; height: number }>;
    seed: number;
    dummyTextTemplate: string;
    /** 省略時は true（Dummy Text をフレーム内に適用） */
    applyDummyText?: boolean;
    /** 省略時は true（Mask Image をフレーム内に適用） */
    applyMaskImage?: boolean;
  }) => void;
}

/** キャンバス選択の main → UI 用サマリ（SceneNode は渡せない） */
export type CanvasSelectionNodeSummary = {
  id: string;
  name: string;
  type: string;
};

export interface CanvasSelectionChangedHandler extends EventHandler {
  name: "CANVAS_SELECTION_CHANGED";
  handler: (data: { nodes: CanvasSelectionNodeSummary[] }) => void;
}

/** UI 初期化後に現在の選択を main へ問い合わせる */
export interface RequestCanvasSelectionHandler extends EventHandler {
  name: "REQUEST_CANVAS_SELECTION";
  handler: () => void;
}
