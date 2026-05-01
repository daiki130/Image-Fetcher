import { h, Fragment } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import {
  IconLanguageSmall24,
  IconToggleButton,
  IconCheck16,
} from "@create-figma-plugin/ui";
import { Tooltip } from "./Tooltip";
import { Lang, LANG_LABELS, SUPPORTED_LANGS } from "../i18n";

interface LanguagePickerProps {
  lang: Lang;
  onChange: (lang: Lang) => void;
  /** ツールチップに出すラベル（例: "言語"） */
  tooltipLabel: string;
}

const MENU_WIDTH = 160;
const MENU_OFFSET_Y = 6;
const TOOLTIP_OFFSET_Y = 6;
/** 親のクリッピング（overflow: auto 等）に巻き込まれないよう、メニュー・ツールチップは
 * いずれもビューポート基準で固定配置する */

/**
 * IconLanguageSmall24 + ポップオーバーで構成された言語切替ピッカー。
 * SettingsMenu と同じトーンのダークメニューで揃える。
 */
export function LanguagePicker({
  lang,
  onChange,
  tooltipLabel,
}: LanguagePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  /**
   * ツールチップの配置に必要なトリガー位置情報。
   * - `centerX`        : トリガー中央の絶対 X 座標（中央揃え時の基準）
   * - `triggerRight`   : トリガー右端の絶対 X 座標（右寄せ時の基準）
   * - `triggerHalfWidth`: トリガー幅の半分。右寄せ時に矢印を
   *   トリガー中心に揃えるためのオフセットとして使う。
   */
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    centerX: number;
    triggerRight: number;
    triggerHalfWidth: number;
  } | null>(null);

  /**
   * ラベルが長くツールチップ右側がビューポートからはみ出しがちな言語。
   * 中央揃えではなく「ツールチップ右端 = トリガー右端」に揃える。
   */
  const isWideTooltipLang = lang === "en" || lang === "fr";

  // メニュー外クリックで閉じる（メニュー自身は document に直挿しなので
  // トリガー要素 / メニュー要素のいずれにも含まれない場合のみ閉じる）
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target == null) return;
      if (triggerRef.current && triggerRef.current.contains(target)) return;
      if (menuRef.current && menuRef.current.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // 開いた瞬間 / リサイズ・スクロール時にトリガーの位置を計測してメニューを再配置
  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPos(null);
      return;
    }
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportWidth =
        typeof window !== "undefined" ? window.innerWidth : MENU_WIDTH;
      // 右端寄せが基本だが、ビューポートを越えないようにクランプ
      let left = rect.right - MENU_WIDTH;
      if (left < 4) left = 4;
      if (left + MENU_WIDTH > viewportWidth - 4) {
        left = viewportWidth - MENU_WIDTH - 4;
      }
      setMenuPos({
        top: rect.bottom + MENU_OFFSET_Y,
        left,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  // ホバー中はツールチップ位置をトリガー基準に追従させる
  useLayoutEffect(() => {
    if (!isHovered || isOpen) {
      setTooltipPos(null);
      return;
    }
    const updateTooltip = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setTooltipPos({
        top: rect.bottom + TOOLTIP_OFFSET_Y,
        // 矢印を中心に揃えるため、トリガー中央を基準にする
        centerX: rect.left + rect.width / 2,
        triggerRight: rect.right,
        triggerHalfWidth: rect.width / 2,
      });
    };
    updateTooltip();
    window.addEventListener("resize", updateTooltip);
    window.addEventListener("scroll", updateTooltip, true);
    return () => {
      window.removeEventListener("resize", updateTooltip);
      window.removeEventListener("scroll", updateTooltip, true);
    };
  }, [isHovered, isOpen]);

  return (
    <Fragment>
      <div
        ref={triggerRef}
        style={{ position: "relative", display: "inline-block" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <IconToggleButton
          value={isOpen}
          onChange={(event) => setIsOpen(event.currentTarget.checked)}
        >
          <IconLanguageSmall24 />
        </IconToggleButton>
      </div>

      {/* {isHovered && !isOpen && tooltipPos && (
        <div
          style={{
            position: "fixed",
            top: `${tooltipPos.top}px`,
            // ツールチップ本体を矢印中心で揃えるため translateX(-50%) する
            left: `${tooltipPos.centerX}px`,
            transform: "translateX(-50%)",
            zIndex: 10000,
            pointerEvents: "none",
          }}
        >
          <Tooltip
            message={tooltipLabel}
            arrowPosition="top"
            arrowOffset="50%"
          />
        </div>
      )} */}
      {tooltipPos &&
        (isWideTooltipLang ? (
          // en / fr など長いラベル向け：ツールチップ右端をトリガー右端に揃え、
          // ビューポート右側で文字が見切れないようにする。矢印だけは
          // トリガー中心に来るよう、ツールチップ右端から triggerHalfWidth 戻した位置に配置。
          <div
            style={{
              position: "fixed",
              top: `${tooltipPos.top}px`,
              left: `${tooltipPos.triggerRight}px`,
              transform: "translateX(-100%)",
              zIndex: 10000,
              pointerEvents: "none",
            }}
          >
            <Tooltip
              message={tooltipLabel}
              arrowPosition="top"
              arrowOffset={`calc(100% - ${tooltipPos.triggerHalfWidth}px)`}
            />
          </div>
        ) : (
          // ja / ko 向け：従来通りトリガー中央に揃える
          <div
            style={{
              position: "fixed",
              top: `${tooltipPos.top}px`,
              left: `${tooltipPos.centerX}px`,
              transform: "translateX(-50%)",
              zIndex: 10000,
              pointerEvents: "none",
            }}
          >
            <Tooltip
              message={tooltipLabel}
              arrowPosition="top"
              arrowOffset="50%"
            />
          </div>
        ))}
      

      {isOpen && menuPos && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: `${menuPos.top}px`,
            left: `${menuPos.left}px`,
            zIndex: 10001,
            background: "#1E1E1E",
            borderRadius: "13px",
            padding: "8px",
            width: `${MENU_WIDTH}px`,
            boxShadow:
              "0px 0px 0.5px 0px rgba(30, 25, 25, 0.15), 0px 5px 12px 0px rgba(0, 0, 0, 0.13), 0px 1px 3px 0px rgba(0, 0, 0, 0.10)",
          }}
        >
          {SUPPORTED_LANGS.map((code) => {
            const isSelected = code === lang;
            return (
              <LanguageMenuItem
                key={code}
                code={code}
                label={LANG_LABELS[code]}
                isSelected={isSelected}
                onClick={() => {
                  onChange(code);
                  setIsOpen(false);
                }}
              />
            );
          })}
        </div>
      )}
    </Fragment>
  );
}

interface LanguageMenuItemProps {
  code: Lang;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

function LanguageMenuItem({
  label,
  isSelected,
  onClick,
}: LanguageMenuItemProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        minHeight: "24px",
        alignItems: "center",
        gap: "var(--space-4)",
        flex: "1 0 0",
        borderRadius: "var(--border-radius-4)",
        cursor: "pointer",
        background: hovered ? "var(--figma-color-bg-brand)" : "transparent",
      }}
    >
      <div
        style={{
          width: "24px",
          height: "24px",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {isSelected && <IconCheck16 />}
      </div>
      <div
        style={{
          color: "#fff",
          fontFamily: "var(--font-family-primary)",
          fontSize: "11px",
          fontWeight: "450",
          lineHeight: "16px",
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
