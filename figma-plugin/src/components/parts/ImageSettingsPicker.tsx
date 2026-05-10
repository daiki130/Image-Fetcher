import { h, Fragment, JSX } from "preact";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import {
  IconToggleButton,
  IconAdjustSmall24,
  IconPlus16,
  IconClose16,
  IconReset16,
} from "@create-figma-plugin/ui";
import { Tooltip } from "../Tooltip";
import { useI18n } from "../../i18n";
import {
  DEFAULT_IMAGE_NAME_KEYWORDS,
  normalizeImageNameKeyword,
  sanitizeImageNameKeywords,
} from "../../imageNameKeywords";
import { Toogle } from "../toggle";

interface ImageSettingsPickerProps {
  /** 現在のキーワード一覧（lowercase 済み） */
  keywords: string[];
  /** ユーザーが追加 / 削除 / リセットしたときに呼ばれる。値は lowercase 済みの一意配列 */
  onChange: (keywords: string[]) => void;
  /**
   * 「既に画像が含まれている要素にも反映する」設定の現在値。
   * true: 既存 IMAGE Fill のみを根拠にしたノードも差し替え対象とする。
   * false: ユーザー指定キーワードに合致するノードのみを対象とする。
   */
  applyToExistingImages: boolean;
  /** 上記トグルの変更ハンドラ。 */
  onApplyToExistingImagesChange: (next: boolean) => void;
}

const MENU_WIDTH = 280;
const MENU_OFFSET_Y = 6;
const TOOLTIP_OFFSET_Y = 6;

/**
 * 画像プレースホルダー検出に使う「レイヤー名キーワード」を編集するピッカー。
 *
 * IconToggleButton + ポップオーバー で構成され、SettingsMenu や LanguagePicker と
 * 同じトーンのダークメニューで揃える。親要素の overflow: auto に巻き込まれないよう、
 * メニュー / ツールチップは fixed 配置でビューポート基準に置く。
 */
export function ImageSettingsPicker({
  keywords,
  onChange,
  applyToExistingImages,
  onApplyToExistingImagesChange,
}: ImageSettingsPickerProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    centerX: number;
    triggerRight: number;
    triggerHalfWidth: number;
  } | null>(null);
  const [inputValue, setInputValue] = useState("");

  // 親から受け取る keywords は念のためここでもサニタイズしておく
  const safeKeywords = useMemo(
    () => sanitizeImageNameKeywords(keywords),
    [keywords],
  );

  const isDefaultEqual = useMemo(() => {
    if (safeKeywords.length !== DEFAULT_IMAGE_NAME_KEYWORDS.length) {
      return false;
    }
    for (let i = 0; i < safeKeywords.length; i++) {
      if (safeKeywords[i] !== DEFAULT_IMAGE_NAME_KEYWORDS[i]) {
        return false;
      }
    }
    return true;
  }, [safeKeywords]);

  // メニュー外クリックで閉じる
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

  // メニューを開いた直後に入力欄へフォーカス（タイピング開始しやすく）
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setInputValue("");
    }
  }, [isOpen]);

  // ホバー中はツールチップ位置をトリガー基準に追従
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

  const handleAdd = () => {
    const normalized = normalizeImageNameKeyword(inputValue);
    if (!normalized) {
      setInputValue("");
      return;
    }
    if (safeKeywords.includes(normalized)) {
      // 既にある場合は入力欄だけクリア（重複扱い）
      setInputValue("");
      return;
    }
    onChange([...safeKeywords, normalized]);
    setInputValue("");
  };

  const handleRemove = (kw: string) => {
    onChange(safeKeywords.filter((k) => k !== kw));
  };

  const handleReset = () => {
    onChange([...DEFAULT_IMAGE_NAME_KEYWORDS]);
  };

  const handleInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdd();
    }
  };

  const handleInput = (event: JSX.TargetedEvent<HTMLInputElement>) => {
    setInputValue(event.currentTarget.value);
  };

  const tooltipLabel = t("ui.imageKeywordsTooltip");

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
          <IconAdjustSmall24 />
        </IconToggleButton>
      </div>

      {tooltipPos && (
        // メニューの位置と同じく、ツールチップ右端をトリガー右端に揃える。
        // 矢印だけはトリガー中心に来るよう triggerHalfWidth ぶん右端から戻す。
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
      )}

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
            padding: "12px 0",
            width: `${MENU_WIDTH}px`,
            boxShadow:
              "0px 0px 0.5px 0px rgba(30, 25, 25, 0.15), 0px 5px 12px 0px rgba(0, 0, 0, 0.13), 0px 1px 3px 0px rgba(0, 0, 0, 0.10)",
            color: "#fff",
            fontFamily: "var(--font-family-primary)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Image Keywords */}
          <div
            style={{
              padding: "0 12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  lineHeight: "16px",
                  textWrap: "auto",
                  wordBreak: "break-word",
                }}
              >
                {t("ui.imageKeywordsTitle")}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  lineHeight: "15px",
                  color: "rgba(255, 255, 255, 0.65)",
                  textWrap: "auto",
                }}
              >
                {t("ui.imageKeywordsDesc")}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "center",
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                placeholder={t("ui.imageKeywordsPlaceholder")}
                onInput={handleInput}
                onKeyDown={handleInputKeyDown}
                style={{
                  flex: "1 1 auto",
                  minWidth: 0,
                  height: "28px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  background: "rgba(255, 255, 255, 0.06)",
                  padding: "0 8px",
                  color: "#fff",
                  fontSize: "11px",
                  outline: "none",
                  fontFamily: "var(--font-family-primary)",
                }}
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={normalizeImageNameKeyword(inputValue).length === 0}
                title={t("ui.imageKeywordsAdd")}
                style={{
                  height: "28px",
                  minWidth: "28px",
                  padding: "0 8px",
                  borderRadius: "6px",
                  border: "none",
                  background:
                    normalizeImageNameKeyword(inputValue).length === 0
                      ? "rgba(255, 255, 255, 0.08)"
                      : "var(--figma-color-bg-brand)",
                  color: "#fff",
                  cursor:
                    normalizeImageNameKeyword(inputValue).length === 0
                      ? "default"
                      : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "2px",
                  fontSize: "11px",
                  fontWeight: "500",
                  opacity:
                    normalizeImageNameKeyword(inputValue).length === 0
                      ? 0.6
                      : 1,
                }}
              >
                <IconPlus16 />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                maxHeight: "180px",
                overflowY: "auto",
                minHeight: "32px",
              }}
            >
              {safeKeywords.length === 0 ? (
                <div
                  style={{
                    fontSize: "11px",
                    lineHeight: "15px",
                    color: "rgba(255, 255, 255, 0.55)",
                    padding: "4px 0",
                  }}
                >
                  {t("ui.imageKeywordsEmpty")}
                </div>
              ) : (
                safeKeywords.map((kw) => (
                  <KeywordChip
                    key={kw}
                    label={kw}
                    removeLabel={t("ui.imageKeywordsRemove")}
                    onRemove={() => handleRemove(kw)}
                  />
                ))
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                // borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                // paddingTop: "8px",
              }}
            >
              <button
                type="button"
                onClick={handleReset}
                disabled={isDefaultEqual}
                style={{
                  height: "26px",
                  padding: "0 8px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  background: "transparent",
                  color: isDefaultEqual ? "rgba(255, 255, 255, 0.4)" : "#fff",
                  cursor: isDefaultEqual ? "default" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: "500",
                  fontFamily: "var(--font-family-primary)",
                }}
              >
                <IconReset16 />
                <span>{t("ui.imageKeywordsReset")}</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div>
            <hr
              style={{
                border: "none",
                margin: 0,
                width: "100%",
                height: "1px",
                background: "rgba(255, 255, 255, 0.18)",
              }}
            />
          </div>

          {/* Dummy Text */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              padding: "6px 8px",
              alignItems: "center",
              boxSizing: "border-box",
              justifyContent: "space-between",
              background: "#383838",
              border: "0.01px solid #444444",
              borderRadius: "6px",
              margin: "0 12px",
              width: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                fontSize: "11px",
                color: "#fff",
              }}
            >
              <div
                style={{
                  fontFamily: 'Inter, "Noto Sans JP", system-ui, sans-serif',
                  color: "#fff",
                  fontWeight: 400,
                  minHeight: "20px",
                  lineHeight: 1.6,
                  textWrap: "auto",
                }}
              >
                {t("ui.applyToExistingImagesDesc")}
              </div>
            </div>
            <Toogle
              value={applyToExistingImages}
              onChange={onApplyToExistingImagesChange}
            />
          </div>
        </div>
      )}
    </Fragment>
  );
}

interface KeywordChipProps {
  label: string;
  removeLabel: string;
  onRemove: () => void;
}

function KeywordChip({ label, removeLabel, onRemove }: KeywordChipProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        height: "24px",
        padding: "0 4px 0 8px",
        borderRadius: "12px",
        background: hovered
          ? "rgba(255, 255, 255, 0.16)"
          : "rgba(255, 255, 255, 0.1)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        color: "#fff",
        fontSize: "11px",
        fontWeight: "450",
        lineHeight: "16px",
        maxWidth: "100%",
      }}
    >
      <span
        style={{
          maxWidth: "180px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        title={removeLabel}
        aria-label={removeLabel}
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "10px",
          border: "none",
          background: "transparent",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <IconClose16 />
      </button>
    </div>
  );
}
