import {
  Button,
  Text,
  Textbox,
  TextboxColor,
  Divider,
} from "@create-figma-plugin/ui";
import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import { ImageData } from "../types";
import { Card } from "./card";
import { Toogle } from "./toggle";

const CATEGORY_ROWS: ReadonlyArray<{ emoji: string; label: string }> = [
  { emoji: "🐶", label: "Dog" },
  { emoji: "🐈", label: "Cat" },
  { emoji: "🪴", label: "Nature" },
  { emoji: "🌻", label: "Flower" },
  { emoji: "👥", label: "People" },
];

const COLS = 6;
const THUMB = 74;

/** `#rrggbb` / `rrggbb` を TextboxColor 用の6桁（#なし・大文字）にする */
function maskColorToHexDigits(maskColor: string): string {
  const trimmed = maskColor.trim();
  const body = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  const upper = body.toUpperCase();
  if (/^[0-9A-F]{6}$/.test(upper)) {
    return upper;
  }
  if (/^[0-9A-F]{3}$/.test(upper)) {
    const [r, g, b] = upper.split("");
    return `${r}${r}${g}${g}${b}${b}`;
  }
  return "FF0000";
}

function IconGithub() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="rgba(0,0,0,0.9)"
      aria-hidden
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function IconGrid({ active }: { active: boolean }) {
  const c = active ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.35)";
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden>
      <path fill={c} d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z" />
    </svg>
  );
}

function IconList({ active }: { active: boolean }) {
  const c = active ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.35)";
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden>
      <path fill={c} d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="rgba(0,0,0,0.65)"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42l-2.5-2.5a1.003 1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  );
}

export interface RandomProps {
  images: ImageData[];
  dummyTextTemplate: string;
  onDummyTextTemplateChange: (value: string) => void;
  maskColor: string;
  onMaskColorChange: (value: string) => void;
  onShuffle: () => void;
  selectedIndices: Set<number>;
  onToggleSelect: (index: number) => void;
  onDragPrepare: (image: ImageData) => void | Promise<void>;
  /** 省略時は GitHub アイコンを表示しない */
  githubUrl?: string;
}

export function Dummy({
  images,
  dummyTextTemplate,
  onDummyTextTemplateChange,
  maskColor,
  onMaskColorChange,
  onShuffle,
  selectedIndices,
  onToggleSelect,
  onDragPrepare,
  githubUrl,
}: RandomProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const categorySlices = CATEGORY_ROWS.map((cat, catIdx) => ({
    ...cat,
    slice: images.slice(catIdx * COLS, catIdx * COLS + COLS),
    offset: catIdx * COLS,
  })).filter((row) => row.slice.length > 0);

  /** マスク適用は RGB のみ（main の parseMaskColorHex）。不透明度は UI 用 */
  const [opacity, setOpacity] = useState<string>("100");
  const hexColor = maskColorToHexDigits(maskColor);
  function handleHexColorInput(event: JSX.TargetedEvent<HTMLInputElement>) {
    const v = event.currentTarget.value;
    const withHash =
      v.trim() === "" ? "#ff0000" : `#${v.trim().replace(/^#/, "")}`;
    onMaskColorChange(withHash);
  }
  function handleOpacityInput(event: JSX.TargetedEvent<HTMLInputElement>) {
    setOpacity(event.currentTarget.value);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        padding: "0 var(--space-extra-small)",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: "600" }}>Settings</div>


        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            background: "var(--figma-color-bg-secondary)",
            borderRadius: "8px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Sample Text */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              padding: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "20px",
                alignItems: "center",
                width: "100%",
                boxSizing: "border-box",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "10px",
                  color: "rgba(0,0,0,0.9)",
                }}
              >
                <div
                  style={{
                    fontFamily: "Inter, sans-serif",
                    color: "var(--figma-color-text)",
                    fontWeight: 700,
                    height: "20px",
                    display: "flex",
                    flexGrow: 1,
                  }}
                >
                  Sample Text
                </div>
                <div
                  style={{
                    fontFamily: 'Inter, "Noto Sans JP", system-ui, sans-serif',
                    color: "var(--figma-color-text-secondary)",
                    fontWeight: 400,
                    minHeight: "20px",
                    lineHeight: 1.35,
                  }}
                >
                  選択した要素のテキスト要素をこの文字に置き換えます
                </div>
              </div>
              <Toogle
                value={true}
                onChange={(value) => {
                  console.log(value);
                }}
              />
            </div>
            <div
              style={{
                flex: "1 1 0",
                minWidth: 0,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Textbox
                  value={dummyTextTemplate}
                  placeholder="テキスト"
                  onValueInput={onDummyTextTemplateChange}
                  spellCheck={false}
                  style={{
                    background: "var(--figma-color-bg-tertiary)",
                    color: "var(--figma-color-text-primary)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 12px 8px 12px",
                    gap: "8px",
                  }}
                />
              </div>
              <div
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
                title="編集"
              >
                <IconEdit />
              </div>
            </div>
          </div>

          <div style={{ padding: "0 12px" }}>
            <Divider />
          </div>

          {/* Musk Image */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "20px",
                alignItems: "center",
                width: "100%",
                boxSizing: "border-box",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "10px",
                  color: "rgba(0,0,0,0.9)",
                }}
              >
                <div
                  style={{
                    fontFamily: "Inter, sans-serif",
                    color: "var(--figma-color-text)",
                    fontWeight: 700,
                    height: "20px",
                    display: "flex",
                    flexGrow: 1,
                  }}
                >
                  Musk Image
                </div>
                <div
                  style={{
                    fontFamily: 'Inter, "Noto Sans JP", system-ui, sans-serif',
                    color: "var(--figma-color-text-secondary)",
                    fontWeight: 400,
                    minHeight: "20px",
                    lineHeight: 1.35,
                  }}
                >
                  選択した要素の画像要素にマスクを設定することができます
                </div>
              </div>
              <Toogle
                value={true}
                onChange={(value) => {
                  console.log(value);
                }}
              />
            </div>
            <div
              style={{
                flex: "1 1 0",
                minWidth: 0,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <TextboxColor
                  hexColor={hexColor}
                  onHexColorInput={handleHexColorInput}
                  onOpacityInput={handleOpacityInput}
                  opacity={opacity}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
