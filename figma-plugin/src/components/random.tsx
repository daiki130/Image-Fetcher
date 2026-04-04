import { Button, Text, Textbox } from "@create-figma-plugin/ui";
import { h } from "preact";
import { ImageData } from "../types";
import { Card } from "./card";

export interface RandomProps {
  images: ImageData[];
  dummyTextTemplate: string;
  onDummyTextTemplateChange: (value: string) => void;
  onShuffle: () => void;
  selectedIndices: Set<number>;
  onToggleSelect: (index: number) => void;
  onDragPrepare: (image: ImageData) => void | Promise<void>;
}

export function Random({
  images,
  dummyTextTemplate,
  onDummyTextTemplateChange,
  onShuffle,
  selectedIndices,
  onToggleSelect,
  onDragPrepare,
}: RandomProps) {
  return (
    <div style={{ marginBottom: "12px", padding: "0 var(--space-extra-small)" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <Text>サンプル画像（Unsplash）</Text>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <Text
            style={{
              fontSize: "11px",
              color: "var(--figma-color-text-secondary)",
            }}
          >
            ダミーに差し替えるテキスト（数字や・などの記号を含む元テキストは置換しません）
          </Text>
          <Textbox
            value={dummyTextTemplate}
            placeholder="テキスト"
            onValueInput={onDummyTextTemplateChange}
            spellCheck={false}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <Button secondary onClick={onShuffle}>
            別の画像
          </Button>
        </div>
        <Text
          style={{
            fontSize: "11px",
            color: "var(--figma-color-text-secondary)",
          }}
        >
          フレームに適用：選択した1枚の画像を、枠の数だけ繰り返し入れます（各枠を画像の塗りで埋めます）
        </Text>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: "8px",
          width: "100%",
        }}
      >
        {images.map((img, sampleIdx) => (
          <Card
            key={img.id ?? `sample-${sampleIdx}`}
            image={img}
            isSelected={selectedIndices.has(sampleIdx)}
            hideOnImageError
            onClick={() => onToggleSelect(sampleIdx)}
            onDragStart={(image) => {
              void onDragPrepare(image);
            }}
          />
        ))}
      </div>
    </div>
  );
}
