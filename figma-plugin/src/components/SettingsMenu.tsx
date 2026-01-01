import { Muted, Text, Divider, IconCheck16 } from "@create-figma-plugin/ui";
import { h } from "preact";
import { useState } from "preact/hooks";

interface SettingsMenuProps {
  sortHighEnabled: boolean;
  sortLowEnabled: boolean;
  sortLabelEnabled: boolean;
  availableImageSizes: string[];
  selectedImageSizes: string[];
  showWithDueDate: boolean;
  showWithoutDueDate: boolean;
  availableLabels: string[];
  selectedLabels: string[];
  onSortHighChange: (enabled: boolean) => void;
  onSortLowChange: (enabled: boolean) => void;
  onSortLabelChange: (enabled: boolean) => void;
  onImageSizeFilterChange: (size: string) => void;
  onDueDateFilterChange: (
    withDueDate: boolean,
    withoutDueDate: boolean
  ) => void;
  onLabelFilterChange: (label: string) => void;
}

// 共通スタイル定義
const styles = {
  header: {
    color: "#fff",
    opacity: 0.4,
    fontFamily: "var(--font-family-primary)",
    fontSize: "11px",
    fontWeight: "450",
    lineHeight: "16px",
    padding: "var(--space-4) var(--space-8)",
  },
  menuItem: {
    display: "flex",
    minHeight: "24px",
    alignItems: "center",
    gap: "var(--space-4)",
    flex: "1 0 0",
    borderRadius: "var(--border-radius-4)",
    cursor: "pointer",
  },
  iconContainer: {
    width: "24px",
    height: "24px",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    color: "#fff",
    fontFamily: "var(--font-family-primary)",
    fontSize: "11px",
    fontWeight: "450",
    lineHeight: "16px",
  },
} as const;

// メニューアイテムコンポーネント
interface MenuItemProps {
  id: string;
  label: string;
  isSelected: boolean;
  hoveredItem: string | null;
  onHover: (id: string | null) => void;
  onClick: () => void;
}

function MenuItem({
  id,
  label,
  isSelected,
  hoveredItem,
  onHover,
  onClick,
}: MenuItemProps) {
  return (
    <div
      style={{
        ...styles.menuItem,
        background:
          hoveredItem === id ? "var(--figma-color-bg-brand)" : "transparent",
      }}
      onClick={onClick}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
    >
      <div style={styles.iconContainer}>{isSelected && <IconCheck16 />}</div>
      <div
        style={{
          ...styles.label,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function SettingsMenu({
  sortHighEnabled,
  sortLowEnabled,
  sortLabelEnabled,
  availableImageSizes,
  selectedImageSizes,
  showWithDueDate,
  showWithoutDueDate,
  availableLabels,
  selectedLabels,
  onSortHighChange,
  onSortLowChange,
  onSortLabelChange,
  onImageSizeFilterChange,
  onDueDateFilterChange,
  onLabelFilterChange,
}: SettingsMenuProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // 排他的選択でありながら選択解除も可能なハンドラー
  const handleSortHighClick = () => {
    if (sortHighEnabled) {
      // 既に選択されている場合は解除
      onSortHighChange(false);
    } else {
      // 選択されていない場合は選択し、低い順を解除（ラベルソートは解除しない）
      onSortHighChange(true);
      onSortLowChange(false);
    }
  };

  const handleSortLowClick = () => {
    if (sortLowEnabled) {
      // 既に選択されている場合は解除
      onSortLowChange(false);
    } else {
      // 選択されていない場合は選択し、高い順を解除（ラベルソートは解除しない）
      onSortLowChange(true);
      onSortHighChange(false);
    }
  };

  const handleSortLabelClick = () => {
    if (sortLabelEnabled) {
      // 既に選択されている場合は解除
      onSortLabelChange(false);
    } else {
      // 選択されていない場合は選択（他のソートは解除しない）
      onSortLabelChange(true);
    }
  };

  const handleWithDueDateClick = () => {
    if (showWithDueDate) {
      // 既に選択されている場合は解除
      onDueDateFilterChange(false, showWithoutDueDate);
    } else {
      // 選択されていない場合は選択し、期限なしを解除
      onDueDateFilterChange(true, false);
    }
  };

  const handleWithoutDueDateClick = () => {
    if (showWithoutDueDate) {
      // 既に選択されている場合は解除
      onDueDateFilterChange(showWithDueDate, false);
    } else {
      // 選択されていない場合は選択し、期限付きを解除
      onDueDateFilterChange(false, true);
    }
  };

  return (
    <div
      style={{
        background: "#1E1E1E",
        borderRadius: "13px",
        padding: "var(--space-8)",
        width: "200px",
        boxShadow:
          "0px 0px 0.5px 0px rgba(30, 25, 25, 0.15), 0px 5px 12px 0px rgba(0, 0, 0, 0.13), 0px 1px 3px 0px rgba(0, 0, 0, 0.10)",
      }}
    >
      {/* 画像サイズセクション */}
      <div style={styles.header}>画像サイズ</div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        {/* 個別のサイズオプション */}
        {availableImageSizes.length > 0 ? (
          availableImageSizes.map((size) => (
            <MenuItem
              key={size}
              id={`imageSize-${size}`}
              label={size}
              isSelected={selectedImageSizes.includes(size)}
              hoveredItem={hoveredItem}
              onHover={setHoveredItem}
              onClick={() => onImageSizeFilterChange(size)}
            />
          ))
        ) : (
          <div style={{ ...styles.label, opacity: 0.6 }}>
            画像サイズがありません
          </div>
        )}
      </div>

      {/* 区切り線 */}
      <div style={{ margin: "var(--space-8) 0" }}>
        <div style={{ background: "#2E2E2E", height: "1px", width: "100%" }} />
      </div>
      {/* 「すべて」オプション */}
      <MenuItem
        key="__ALL__"
        id="imageSize-__ALL__"
        label="すべて"
        isSelected={selectedImageSizes.includes("__ALL__")}
        hoveredItem={hoveredItem}
        onHover={setHoveredItem}
        onClick={() => onImageSizeFilterChange("__ALL__")}
      />
    </div>
  );
}
