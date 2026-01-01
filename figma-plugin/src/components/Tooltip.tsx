import { h } from "preact";

interface TooltipProps {
  message: string;
  isStarred?: boolean;
  date?: string;
  arrowPosition?: "top" | "bottom";
  arrowOffset?: string; // 矢印の水平位置調整（例: "10px", "50%", "-5px"）
}

export function Tooltip({
  message,
  arrowPosition,
  arrowOffset = "50%",
}: TooltipProps) {
  const isArrowTop = arrowPosition === "top";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isArrowTop ? "column" : "column-reverse",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* 矢印 */}
      <div
        style={{
          width: "12px",
          height: "6px",
          position: "absolute",
          left: arrowOffset,
          transform: "translateX(-50%)",
          [isArrowTop ? "top" : "bottom"]: "0px",
          zIndex: 1,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="6"
          viewBox="0 0 12 6"
          fill="none"
          style={{
            transform: isArrowTop ? "none" : "rotate(180deg)",
          }}
        >
          <path d="M6 0L-5.96046e-08 6L12 6L6 0Z" fill="#1E1E1E" />
        </svg>
      </div>

      {/* Tooltipボックス */}
      <div
        style={{
          display: "inline-flex",
          maxWidth: "200px",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "5px",
          background: "#1E1E1E",
          padding: "var(--space-4) var(--space-8)",
          boxShadow:
            "0px 0px 0.5px 0px rgba(0, 0, 0, 0.15), 0px 5px 12px 0px rgba(0, 0, 0, 0.13), 0px 1px 3px 0px rgba(0, 0, 0, 0.10)",
          whiteSpace: "nowrap",
          marginTop: isArrowTop ? "6px" : "0",
          marginBottom: isArrowTop ? "0" : "6px",
        }}
      >
        <div style={{ fontSize: "11px", color: "#fff" }}>{message}</div>
      </div>
    </div>
  );
}
