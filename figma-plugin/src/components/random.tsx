import { Button, Text, Textbox } from "@create-figma-plugin/ui";
import { h } from "preact";
import { useState } from "preact/hooks";
import { ImageData } from "../types";
import { Card } from "./card";

const CATEGORY_ROWS: ReadonlyArray<{ emoji: string; label: string }> = [
  { emoji: "🐶", label: "Dog" },
  { emoji: "🐈", label: "Cat" },
  { emoji: "🪴", label: "Nature" },
  { emoji: "🌻", label: "Flower" },
  { emoji: "👥", label: "People" },
];

const COLS = 6;
const THUMB = 74;

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
      <path
        fill={c}
        d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z"
      />
    </svg>
  );
}

function IconList({ active }: { active: boolean }) {
  const c = active ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.35)";
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden>
      <path
        fill={c}
        d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z"
      />
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
  onShuffle: () => void;
  selectedIndices: Set<number>;
  onToggleSelect: (index: number) => void;
  onDragPrepare: (image: ImageData) => void | Promise<void>;
  /** 省略時は GitHub アイコンを表示しない */
  githubUrl?: string;
}

export function Random({
  images,
  dummyTextTemplate,
  onDummyTextTemplateChange,
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
      {/* Sample Text */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "stretch",
          padding: "8px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flexShrink: 0,
            width: "250px",
            maxWidth: "42%",
            fontSize: "10px",
            color: "rgba(0,0,0,0.9)",
          }}
        >
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              height: "20px",
              display: "flex",
              alignItems: "center",
            }}
          >
            Sample Text
          </div>
          <div
            style={{
              fontFamily:
                'Inter, "Noto Sans JP", system-ui, sans-serif',
              fontWeight: 400,
              minHeight: "20px",
              lineHeight: 1.35,
            }}
          >
            選択した要素のテキスト要素をこの文字に置き換えます
          </div>
        </div>
        <div
          style={{
            flex: "1 1 0",
            minWidth: 0,
            background: "#f1f1f1",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px 8px 12px",
            gap: "8px",
          }}
        >
          <Text
            style={{
              fontFamily: "Menlo, Monaco, monospace",
              fontSize: "11px",
              color: "rgba(0,0,0,0.9)",
              flexShrink: 0,
            }}
          >
            Text
          </Text>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Textbox
              value={dummyTextTemplate}
              placeholder="テキスト"
              onValueInput={onDummyTextTemplateChange}
              spellCheck={false}
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

      <div
        style={{
          height: "1px",
          width: "100%",
          background: "#e6e6e6",
          margin: "8px 0",
        }}
      />

      {/* Source bar + view toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            background: "#f1f1f1",
            borderRadius: "8px",
            padding: "8px",
            maxWidth: "calc(100% - 120px)",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "4px",
              background:
                "linear-gradient(135deg, #111 0%, #444 50%, #111 100%)",
              flexShrink: 0,
            }}
          />
          <Text
            style={{
              fontFamily: "Menlo, Monaco, monospace",
              fontSize: "11px",
              color: "rgba(0,0,0,0.9)",
              whiteSpace: "nowrap",
            }}
          >
            Unsplash
          </Text>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e6e6e6",
              borderRadius: "4px",
              padding: "2px 8px",
              height: "22px",
              display: "flex",
              alignItems: "center",
              boxSizing: "border-box",
            }}
          >
            <Text
              style={{
                fontFamily: "Menlo, Monaco, monospace",
                fontSize: "10px",
                color: "rgba(0,0,0,0.9)",
              }}
            >
              {images.length} images
            </Text>
          </div>
          <Button secondary onClick={onShuffle}>
            別の画像
          </Button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {githubUrl ? (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "4px",
                color: "inherit",
              }}
              title="GitHub"
            >
              <IconGithub />
            </a>
          ) : null}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#f1f1f1",
              borderRadius: "9999px",
              padding: "4px",
              gap: 0,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "9999px",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: viewMode === "grid" ? "#fff" : "transparent",
                boxShadow:
                  viewMode === "grid"
                    ? "0 1px 2px rgba(0,0,0,0.08)"
                    : "none",
              }}
              title="Grid"
            >
              <IconGrid active={viewMode === "grid"} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "9999px",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: viewMode === "list" ? "#fff" : "transparent",
                boxShadow:
                  viewMode === "list"
                    ? "0 1px 2px rgba(0,0,0,0.08)"
                    : "none",
              }}
              title="List"
            >
              <IconList active={viewMode === "list"} />
            </button>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        {viewMode === "grid"
          ? categorySlices.map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  padding: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontFamily: "Menlo, Monaco, monospace",
                    fontWeight: 700,
                    fontSize: "11px",
                    color: "#000",
                  }}
                >
                  <span>{row.emoji}</span>
                  <span>{row.label}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    alignItems: "flex-start",
                  }}
                >
                  {row.slice.map((img, j) => {
                    const globalIdx = row.offset + j;
                    return (
                      <div
                        key={img.id ?? `g-${globalIdx}`}
                        style={{
                          width: THUMB,
                          height: THUMB,
                          flexShrink: 0,
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <Card
                          image={img}
                          isSelected={selectedIndices.has(globalIdx)}
                          hideOnImageError
                          compact
                          onClick={() => onToggleSelect(globalIdx)}
                          onDragStart={(image) => {
                            void onDragPrepare(image);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          : categorySlices.map((row) => (
              <div
                key={`list-${row.label}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  padding: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontFamily: "Menlo, Monaco, monospace",
                    fontWeight: 700,
                    fontSize: "11px",
                    color: "#000",
                  }}
                >
                  <span>{row.emoji}</span>
                  <span>{row.label}</span>
                </div>
                {row.slice.map((img, j) => {
                  const globalIdx = row.offset + j;
                  return (
                    <div
                      key={img.id ?? `l-${globalIdx}`}
                      role="button"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "4px 0",
                        cursor: "pointer",
                        borderRadius: "4px",
                        background: selectedIndices.has(globalIdx)
                          ? "var(--figma-color-bg-selected)"
                          : "transparent",
                      }}
                      onClick={() => onToggleSelect(globalIdx)}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          flexShrink: 0,
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <Card
                          image={img}
                          isSelected={selectedIndices.has(globalIdx)}
                          hideOnImageError
                          compact
                          onDragStart={(image) => {
                            void onDragPrepare(image);
                          }}
                        />
                      </div>
                      <Text
                        style={{
                          fontSize: "11px",
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {img.alt || "Image"}
                      </Text>
                    </div>
                  );
                })}
              </div>
            ))}
      </div>

      <Text
        style={{
          fontSize: "11px",
          color: "var(--figma-color-text-secondary)",
          padding: "4px 8px 0",
          lineHeight: 1.4,
        }}
      >
        フレームに適用：選択した1枚の画像を、枠の数だけ繰り返し入れます（各枠を画像の塗りで埋めます）
      </Text>
    </div>
  );
}
