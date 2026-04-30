import { h, Fragment, JSX } from "preact";
import {
  Text,
  IconSection16,
  IconFrame16,
  IconComponent16,
  IconComponentSet16,
  IconText16,
  IconRectangle16,
  IconEllipse16,
  IconLine16,
  IconPolygon16,
  IconStar16,
  IconSlide16,
  IconImage16,
  IconBoolean16,
  // IconVector24,
  IconSticky16,
  IconWidget16,
} from "@create-figma-plugin/ui";
import { CanvasSelectionNodeSummary, ImageData } from "../types";
import { Toogle } from "./toggle";
import { Button } from "./parts/Button";

function NodeTypeIcon({ type }: { type: string }): JSX.Element {
  switch (type) {
    case "FRAME":
      return <IconFrame16 />;
    case "SECTION":
      return <IconSection16 />;
    case "GROUP":
      return <IconFrame16 />;
    case "COMPONENT":
      return <IconComponent16 />;
    case "COMPONENT_SET":
      return <IconComponentSet16 />;
    case "INSTANCE":
      return <IconComponent16 />;
    case "TEXT":
      return <IconText16 />;
    case "RECTANGLE":
      return <IconRectangle16 />;
    case "ELLIPSE":
      return <IconEllipse16 />;
    case "LINE":
      return <IconLine16 />;
    case "POLYGON":
      return <IconPolygon16 />;
    case "STAR":
      return <IconStar16 />;
    case "VECTOR":
      // return <IconVectorBend16 />;
    case "BOOLEAN_OPERATION":
      return <IconBoolean16 />;
    case "SLICE":
      // return <IconSlice16 />;
    case "STICKY":
      return <IconSticky16 />;
    case "WIDGET":
      return <IconWidget16 />;
    default:
      return <IconImage16 />;
  }
}

export interface FooterProps {
  // onApplyToSelection: () => void;
  tabValue: "Dummy" | "Top";
  matchAspectRatioForFrame: boolean;
  setMatchAspectRatioForFrame: (checked: boolean) => void;
  selectAllCheckboxValue: boolean;
  handleSelectAllCheckboxValueChange: (checked: boolean) => void;
  imagesToDisplay: ImageData[] | undefined;
  onApplyAll: () => void;
  applyToSelectionDisabled: boolean;
  applyAllDisabled: boolean;
  applyAllLoading: boolean;
  /** キャンバス選択のサマリ（main 経由で同期） */
  canvasSelection: CanvasSelectionNodeSummary[];
  /** 画像が1件以上選択されているかどうか */
  hasSelectedImages: boolean;
}

export function Footer({
  tabValue,
  matchAspectRatioForFrame,
  setMatchAspectRatioForFrame,
  selectAllCheckboxValue,
  handleSelectAllCheckboxValueChange,
  imagesToDisplay,
  onApplyAll,
  applyToSelectionDisabled,
  applyAllDisabled,
  applyAllLoading,
  canvasSelection,
  hasSelectedImages,
}: FooterProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "0",
        left: "0",
        right: "0",
        padding: "8px",
        zIndex: 99,
        background: "var(--figma-color-bg)",
        display: "flex",
        gap: "4px",
        alignItems: "center",
        borderTop: "1px solid var(--figma-color-border)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            flex: 1,
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            minWidth: 0,
          }}
        >
          {/* 画像とサイズのアスペクト比が近しいものをマッチ */}
          {tabValue === "Top" && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
                alignItems: "center",
                padding: "12px 12px 12px 16px",
                background: "var(--figma-color-bg-secondary)",
                borderRadius: "6px",
                border: "0.01px solid var(--figma-color-border)",
              }}
            >
              <div>
                <Text>Match aspect ratio</Text>
              </div>
              <Toogle
                value={matchAspectRatioForFrame}
                onChange={setMatchAspectRatioForFrame}
              />
            </div>
          )}
          <Button
            fullWidth
            loading={applyAllLoading}
            onClick={onApplyAll}
            disabled={applyAllDisabled}
            style={{
              color: "#fff",
              height: "40px",
              flex: 1,
              minWidth: 0,
              borderRadius: "8px",
              fontSize: "13px",
              backgroundColor: applyAllDisabled
                ? "var(--figma-color-bg-disabled)"
                : "var(--figma-color-bg-brand)",
            }}
          >
            Apply
          </Button>

          {/* <Button
            fullWidth
            loading={applyAllLoading}
            onClick={onApplyAll}
            disabled={applyAllDisabled}
            style={{
              color: "#fff",
              height: "40px",
              flex: 1,
              minWidth: 0,
              borderRadius: "8px",
              fontSize: "13px",
            }}
          >
            Apply
          </Button> */}
        </div>
        {(() => {
          const isMessageHidden =
            canvasSelection.length > 0 &&
            (tabValue === "Dummy" || hasSelectedImages);
          return (
            <div
              style={{
                fontSize: "11px",
                color: "var(--figma-color-text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                height: isMessageHidden ? 0 : "20px",
                marginTop: isMessageHidden ? 0 : "8px",
                opacity: isMessageHidden ? 0 : 1,
                pointerEvents: isMessageHidden ? "none" : "auto",
                transition:
                  "height 200ms ease, margin-top 200ms ease, opacity 150ms ease",
              }}
              title={
                canvasSelection.length === 0
                  ? undefined
                  : canvasSelection
                      .map((n) => `${n.type}: ${n.name}`)
                      .join("\n")
              }
            >
            {canvasSelection.length === 0 ? (
              tabValue === "Top"
                ? hasSelectedImages
                  ? "要素を選択してください"
                  : "画像・要素を選択してください"
                : "フレームを選択してください"
            ) : (
              <Fragment>
                {tabValue === "Top" && !hasSelectedImages && (
                  <span style={{ flex: "0 0 auto" }}>
                    画像を選択してください
                  </span>
                )}
              </Fragment>
            )}
            </div>
          );
        })()}
        {/* 選択された画像のサムネイルスタック */}
        {/* {selectedImageOrder.length > 0 && (
        <div
          style={{
            position: "absolute",
            left: "4%",
            bottom: "37%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "40px",
            width: "80px",
          }}
        >
          {selectedImageOrder.map((index, stackIndex) => {
            const selectedImage = images[index];
            if (!selectedImage) return null;
            // 最新の選択が上に来るように、stackIndexが大きいほど高いz-index
            // 最初の選択（stackIndex = 0）が最も下、最新の選択（stackIndex = length - 1）が最も上
            const displayIndex =
              selectedImageOrder.length - 1 - stackIndex;
            const isNewlyAdded = newlyAddedIndex === index;
            // 最新3枚以外はopacity 0にする
            const isInLatestThree =
              stackIndex >= selectedImageOrder.length - 3;
            const targetY = displayIndex * -4;
            const targetScale = 1 - displayIndex * 0.08;

            return (
              <div
                key={index} // stackIndexを含めないことで、位置が変わっても同じ要素として認識される
                style={{
                  position: "absolute",
                  width: "100px",
                  height: "60px",
                  borderRadius: "4px",
                  overflow: "hidden",
                  backgroundColor: "var(--figma-color-bg-secondary)",
                  boxShadow: "0px 3px 8px rgba(0, 0, 0, 0.7)",
                  zIndex: stackIndex + 1, // stackIndexが大きいほど高いz-index（最新が上）
                  transition: isNewlyAdded
                    ? "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                    : "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                  transform: isNewlyAdded
                    ? `translateX(-120px) translateY(${targetY}px) scale(${targetScale})`
                    : `translateX(0px) translateY(${targetY}px) scale(${targetScale})`,
                  opacity: isInLatestThree
                    ? 1 - displayIndex * 0.1
                    : 0, // 最新3枚以外はopacity 0
                }}
                ref={(el) => {
                  if (el && isNewlyAdded) {
                    // 次のフレームでアニメーションを開始
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        el.style.transform = `translateX(0px) translateY(${targetY}px) scale(${targetScale})`;
                      });
                    });
                  }
                }}
                onTransitionEnd={() => {
                  if (isNewlyAdded) {
                    setNewlyAddedIndex(null);
                  }
                }}
              >
                <img
                  src={selectedImage.src}
                  alt={selectedImage.alt || "Selected image"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            );
          })}
        </div>
      )} */}
      </div>
    </div>
  );
}
