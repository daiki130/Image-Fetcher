import { h } from "preact";
import { Button, Checkbox, Text, Toggle } from "@create-figma-plugin/ui";
import { ImageData } from "../types";
import { Toogle } from "./toggle";

export interface FooterProps {
  // onApplyToSelection: () => void;
  matchAspectRatioForFrame: boolean;
  setMatchAspectRatioForFrame: (checked: boolean) => void;
  selectAllCheckboxValue: boolean;
  handleSelectAllCheckboxValueChange: (checked: boolean) => void;
  imagesToDisplay: ImageData[] | undefined;
  onApplyAll: () => void;
  applyToSelectionDisabled: boolean;
  applyAllDisabled: boolean;
  applyAllLoading: boolean;
}

export function Footer({
  matchAspectRatioForFrame,
  setMatchAspectRatioForFrame,
  selectAllCheckboxValue,
  handleSelectAllCheckboxValueChange,
  imagesToDisplay,
  onApplyAll,
  applyToSelectionDisabled,
  applyAllDisabled,
  applyAllLoading,
}: FooterProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "0",
        left: "0",
        right: "0",
        padding: "8px 8px 8px 20px",
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
          gap: "4px",
          flex: 1,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            minHeight: "32px",
          }}
        >
          <Toggle
            value={matchAspectRatioForFrame}
            onValueChange={setMatchAspectRatioForFrame}
            disabled={imagesToDisplay?.length === 0}
          >
            <Text>画像とサイズのアスペクト比が近しいものをマッチ</Text>
          </Toggle>
        </div> */}

        {/* 画像とサイズのアスペクト比が近しいものをマッチ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            alignItems: "center",
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
        <div
          style={{
            display: "flex",
            gap: "40px",
          }}
        >
          <Button
            fullWidth
            loading={applyAllLoading}
            onClick={onApplyAll}
            disabled={applyAllDisabled}
            style={{
              color: "#fff",
              height: "40px",
              width: "290px",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          >
            Apply
          </Button>
        </div>
      </div>
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
  );
}
