import { h, Fragment } from "preact";

const NAMES = [
  "Hero",
  "Card 01",
  "Banner",
  "Promo",
  "Card 02",
  "Thumb A",
  "Card 03",
  "Sidebar",
  "Footer",
  "Modal",
  "Thumb B",
  "Card 04",
];
const AC = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ec4899",
  "#22c55e",
  "#8b5cf6",
  "#3b82f6",
  "#f59e0b",
  "#22c55e",
  "#ec4899",
  "#8b5cf6",
  "#3b82f6",
];
const BG = [
  "#1a3a25",
  "#1a2a3a",
  "#3a2a10",
  "#3a1a2a",
  "#1a3a25",
  "#2a1a3a",
  "#1a2a3a",
  "#3a2a10",
  "#1a3a25",
  "#3a1a2a",
  "#2a1a3a",
  "#1a2a3a",
];

/** 1ブロックの行数（4列×この行＝セル数） */
const ROWS_IN_BLOCK = 8;
const COLS = 4;
const CELLS_IN_BLOCK = ROWS_IN_BLOCK * COLS;

/** 1セルあたりの適用サイクル（秒）— 次々にずらす基準 */
const CELL_CYCLE_S = 2.6;
/** 上方向スクロール1ブロック分に要する秒数（無限ループ） */
const SCROLL_DURATION_S = 22;

function GridBlock({ blockId }: { blockId: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gap: "6px",
        width: "100%",
      }}
    >
      {Array.from({ length: CELLS_IN_BLOCK }, (_, i) => {
        const tone = i % 12;
        const ac = AC[tone];
        const bg = BG[tone];
        const stagger = (tone * (CELL_CYCLE_S / 12)) % CELL_CYCLE_S;
        const cycle = `${CELL_CYCLE_S}s`;

        const cssVar = {
          "--apply-ac": ac,
          "--apply-bg": bg,
        } as h.JSX.CSSProperties;

        return (
          <div
            key={`${blockId}-${i}`}
            style={{
              ...cssVar,
              aspectRatio: "3 / 4",
              position: "relative",
              overflow: "hidden",
              borderRadius: "4px",
              border: "1px dashed var(--figma-color-border)",
              background: "var(--figma-color-bg-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: `applyImgModal_cellSurface ${cycle} ease-in-out infinite`,
              animationDelay: `${stagger}s`,
            }}
          >
            {/* スキャンライン */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: "2px",
                background: "var(--apply-ac)",
                zIndex: 4,
                pointerEvents: "none",
                boxShadow: "0 0 6px var(--apply-ac)",
                animation: `applyImgModal_scanLine ${cycle} ease-in-out infinite`,
                animationDelay: `${stagger}s`,
              }}
            />
            {/* 中央アイコン */}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                animation: `applyImgModal_iconPulse ${cycle} ease-in-out infinite`,
                animationDelay: `${stagger}s`,
              }}
              dangerouslySetInnerHTML={{
                __html: `<svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="${ac}" stroke-width="0.8" opacity="0.85"/><circle cx="4.5" cy="4.5" r="1.3" fill="${ac}" opacity="0.75"/><path d="M1 9.5l3-2.5 2.5 2 2.5-3.5 4 5" stroke="${ac}" stroke-width="0.8" fill="none" stroke-linejoin="round"/></svg>`,
              }}
            />
            {/* ラベル */}
            <div
              style={{
                position: "absolute",
                bottom: "3px",
                left: "2px",
                right: "2px",
                fontSize: "6px",
                color: "var(--figma-color-text-secondary)",
                fontFamily: "monospace",
                textAlign: "center",
                lineHeight: 1.1,
                zIndex: 1,
                animation: `applyImgModal_labelFade ${cycle} ease-in-out infinite`,
                animationDelay: `${stagger}s`,
              }}
            >
              {NAMES[tone]}
            </div>
            {/* チェック */}
            <div
              style={{
                position: "absolute",
                top: "3px",
                right: "3px",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "var(--apply-ac)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 6,
                animation: `applyImgModal_checkPop ${cycle} ease-in-out infinite`,
                animationDelay: `${stagger}s`,
              }}
            >
              <svg width="7" height="7" viewBox="0 0 7 7" fill="none" aria-hidden="true">
                <path
                  d="M1 3.5L2.8 5.2L6 1.5"
                  stroke="white"
                  stroke-width="1.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface ApplyImageLoadingModalProps {
  visible: boolean;
  /** 実際の Apply 実行中のみ。{ current: 完了件数, total: 全体件数 } */
  progress: { current: number; total: number } | null;
}

export function ApplyImageLoadingModal({
  visible,
  progress,
}: ApplyImageLoadingModalProps) {
  if (!visible) {
    return null;
  }

  const scrollDur = `${SCROLL_DURATION_S}s`;

  return (
    <Fragment>
      <style>
        {`
@keyframes applyImgModal_spin { to { transform:rotate(360deg); } }
@keyframes applyImgModal_blink { 0%,100%{opacity:1} 50%{opacity:0.15} }
@keyframes applyImgModal_modalIn {
  from { opacity:0; transform:scale(0.94); }
  to   { opacity:1; transform:scale(1); }
}
/* 無限スクロール（内容を上下に複製し translateY -50%） */
@keyframes applyImgModal_scrollUp {
  from { transform: translateY(0); }
  to   { transform: translateY(-50%); }
}
/* セル：枠・背景がアクセントに切り替わり、終わりで戻る */
@keyframes applyImgModal_cellSurface {
  0%, 100% {
    border-color: var(--figma-color-border);
    background: var(--figma-color-bg-secondary);
    border-style: dashed;
  }
  8% {
    border-style: solid;
    border-color: var(--apply-ac);
    background: var(--apply-bg);
  }
  42% {
    border-color: var(--apply-ac);
    background: var(--apply-bg);
    opacity: 1;
  }
  55% {
    border-color: color-mix(in srgb, var(--apply-ac) 55%, var(--figma-color-border));
  }
  72%, 100% {
    border-style: dashed;
    border-color: var(--figma-color-border);
    background: var(--figma-color-bg-secondary);
  }
}
@keyframes applyImgModal_scanLine {
  0%, 7%  { top: 0; opacity: 0; }
  9%  { opacity: 1; }
  10% { top: 0; }
  38% { top: calc(100% - 2px); opacity: 1; }
  39%, 100% { opacity: 0; top: 100%; }
}
@keyframes applyImgModal_iconPulse {
  0%, 6%  { transform: scale(0.92); opacity: 0.65; }
  15% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.03); opacity: 1; }
  100% { transform: scale(1); opacity: 0.9; }
}
@keyframes applyImgModal_labelFade {
  0%, 10% { opacity: 0.45; }
  20%, 45% { opacity: 1; }
  60%, 100% { opacity: 0.35; }
}
@keyframes applyImgModal_checkPop {
  0%, 32% { transform: scale(0); opacity: 0; }
  38% { transform: scale(1.2); opacity: 1; }
  44%, 100% { transform: scale(1); opacity: 1; }
}
`}
      </style>
      <div
        role="alertdialog"
        aria-busy="true"
        aria-labelledby="apply-img-loading-title"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          background: "rgba(0,0,0,0.72)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "relative",
            background: "var(--figma-color-bg)",
            border: "1px solid var(--figma-color-border)",
            borderRadius: "12px",
            padding: "12px",
            width: "500px",
            maxWidth: "calc(100% - 32px)",
            animation: "applyImgModal_modalIn 0.25s ease",
            boxSizing: "border-box",
          }}
        >
          <h2
            id="apply-img-loading-title"
            style={{
              position: "absolute",
              width: "1px",
              height: "1px",
              padding: 0,
              margin: "-1px",
              overflow: "hidden",
              clip: "rect(0,0,0,0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          >
            画像適用ローディング
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            {/* <div
              style={{
                width: "16px",
                height: "16px",
                border: "2.5px solid #22c55e",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "applyImgModal_spin 0.85s linear infinite",
                flexShrink: 0,
              }}
            /> */}
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--figma-color-text)",
              }}
            >
              Applying...
            </div>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: "3px",
              }}
            >
              {[0, 0.2, 0.4].map((delay) => (
                <div
                  key={delay}
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: "#22c55e",
                    animation: `applyImgModal_blink 1s ease ${delay}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>

          {progress != null && progress.total > 0 && (
            <div
              role="status"
              aria-live="polite"
              aria-label={`${progress.total}件中${progress.current}件が処理完了`}
              style={{
                marginBottom: "12px",
                padding: "8px 10px",
                borderRadius: "6px",
                background: "var(--figma-color-bg-secondary)",
                border: "1px solid var(--figma-color-border)",
                fontSize: "12px",
                color: "var(--figma-color-text)",
                textAlign: "center",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span style={{ fontWeight: 600 }}>
                {progress.total} 件中 {progress.current} 件
              </span>
              <span style={{ color: "var(--figma-color-text-secondary)" }}>
                {" "}
                が処理完了
                {progress.current < progress.total ? "（続けて処理中…）" : ""}
              </span>
            </div>
          )}

          {/* 上方向へ流れ続けるグリッド（同一ブロックを2つ積み -50% で継ぎ目なし） */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "8px",
              height: "200px",
              maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
            }}
          >
            <div
              style={{
                animation: `applyImgModal_scrollUp ${scrollDur} linear infinite`,
                willChange: "transform",
              }}
            >
              <GridBlock blockId="a" />
              <GridBlock blockId="b" />
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
