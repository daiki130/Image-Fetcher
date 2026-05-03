import { h, Fragment } from "preact";
import { useI18n } from "../i18n";

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
        // 負の animation-delay を使うことで、各セルが「異なる位相から即座に再生開始」する。
        // 正の値にすると遅延中は 0% フレームで停止するため、短時間しか表示されない
        // Dummy タブではセルによってアニメーションが動き出さず止まって見える。
        //
        // さらに、i をそのまま使うと「i が大きいセル＝位相が進んでいる＝スキャンが先
        // に進行している」となり、行メジャーで並んでいるこのグリッドでは「右→左」に
        // 走って見えてしまう。グリッドの左上から順に適用されているように見せるため
        // に、基準を (CELLS_IN_BLOCK - 1 - i) に反転させる（左上が最も位相が進んだ
        // 状態から再生されるので、その後の各時刻では左のセルの方が先にスキャンが
        // 完了するように見える）。
        const idx = CELLS_IN_BLOCK - 1 - i;
        const stagger = -((idx * (CELL_CYCLE_S / CELLS_IN_BLOCK)) % CELL_CYCLE_S);
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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* ベース面：枠・背景はセル本体ではなくオーバーレイに持たせる。
                こうすることで、上に重ねるアクセント面（同サイズ・同形状）が
                完全に覆い隠せるため、二重枠にならない。 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "4px",
                border: "1px dashed var(--figma-color-border)",
                background: "var(--figma-color-bg-secondary)",
                boxSizing: "border-box",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
            {/* アクセント面：background / border-color を直接アニメすると paint が
                走り main スレッドが詰まると止まる。代わりにセル全面を覆う不透明な
                オーバーレイを opacity だけで fade in/out させることで、セル表面の
                色・枠の「切り替え」を GPU コンポジタのみで表現する。 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "4px",
                border: "1px solid var(--apply-ac)",
                background: "var(--apply-bg)",
                boxSizing: "border-box",
                pointerEvents: "none",
                zIndex: 0,
                opacity: 0,
                animation: `applyImgModal_cellAccent ${cycle} ease-in-out infinite`,
                animationDelay: `${stagger}s`,
                willChange: "opacity",
              }}
            />
            {/* スキャンライン：
                外側の wrapper（セル全体を覆い overflow:hidden で clip）、
                真ん中の travel が transform:translateY で上→下へ移動（GPU コンポジタ）、
                中のライン自体は opacity のフェードのみ（これも composited）。
                `top` を使わずレイアウトを起こさないため、main スレッドが詰まって
                いてもスキャンが止まらない。 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                pointerEvents: "none",
                zIndex: 4,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  animation: `applyImgModal_scanTravel ${cycle} ease-in-out infinite`,
                  animationDelay: `${stagger}s`,
                  willChange: "transform",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    height: "2px",
                    background: "var(--apply-ac)",
                    boxShadow: "0 0 6px var(--apply-ac)",
                    animation: `applyImgModal_scanFade ${cycle} ease-in-out infinite`,
                    animationDelay: `${stagger}s`,
                    willChange: "opacity",
                  }}
                />
              </div>
            </div>
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
  const { t } = useI18n();
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
/* セル：アクセント面（枠 + 背景）を opacity の fade で切り替える。
   opacity は合成スレッド（GPU）で処理されるため、main スレッドが詰まっていても
   なめらかに再生される。 */
@keyframes applyImgModal_cellAccent {
  0%, 6%    { opacity: 0; }
  10%, 50%  { opacity: 1; }
  72%, 100% { opacity: 0; }
}
/* スキャンラインの「移動」— transform: translateY のみで composited */
@keyframes applyImgModal_scanTravel {
  0%, 10% { transform: translateY(0); }
  38%, 100% { transform: translateY(calc(100% - 2px)); }
}
/* スキャンラインの「フェード」— opacity のみで composited */
@keyframes applyImgModal_scanFade {
  0%, 7%  { opacity: 0; }
  9%, 38% { opacity: 1; }
  39%, 100% { opacity: 0; }
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
            {t("ui.applyImageLoadingTitle")}
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
              {t("ui.applying")}
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
              aria-label={
                t("ui.progressItems", {
                  total: progress.total,
                  current: progress.current,
                }) + t("ui.progressDone")
              }
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
                {t("ui.progressItems", {
                  total: progress.total,
                  current: progress.current,
                })}
              </span>
              <span style={{ color: "var(--figma-color-text-secondary)" }}>
                {t("ui.progressDone")}
                {progress.current < progress.total
                  ? t("ui.progressContinuing")
                  : ""}
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
