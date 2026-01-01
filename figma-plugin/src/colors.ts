// カラー定義
export const colors = {
  // 背景色
  background: {
    primary: "#141414",
    secondary: "#fff",
    card: "#fff",
    cardSelected: "#e3f2fd",
    imagePlaceholder: "#f5f5f5",
  },

  // テキスト色
  text: {
    primary: "#fff",
    secondary: "#666",
    tertiary: "#999",
    disabled: "#999",
  },

  // ボーダー色
  border: {
    default: "#e0e0e0",
    selected: "#18A0FB",
    hover: "#18A0FB",
  },

  // 影
  shadow: {
    hover: "0 8px 24px rgba(0, 0, 0, 0.9)",
    default: "0 2px 8px rgba(0, 0, 0, 0.1)",
    none: "none",
  },

  // アクセントカラー
  accent: {
    primary: "#18A0FB",
    hover: "#18A0FB",
  },

  // フォント
  font: {
    primary:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    code: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  },
} as const;

// CSS変数として使用するための文字列
export const colorVars = {
  backgroundPrimary: "var(--color-background-primary)",
  backgroundSecondary: "var(--color-background-secondary)",
  backgroundCard: "var(--color-background-card)",
  backgroundCardSelected: "var(--color-background-card-selected)",
  backgroundImagePlaceholder: "var(--color-background-image-placeholder)",
  textPrimary: "var(--color-text-primary)",
  textSecondary: "var(--color-text-secondary)",
  textTertiary: "var(--color-text-tertiary)",
  borderDefault: "var(--color-border-default)",
  borderSelected: "var(--color-border-selected)",
  borderHover: "var(--color-border-hover)",
  shadowHover: "var(--color-shadow-hover)",
  shadowDefault: "var(--color-shadow-default)",
  accentPrimary: "var(--color-accent-primary)",
} as const;

