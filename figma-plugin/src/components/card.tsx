import { h } from "preact";
import { useState } from "preact/hooks";
import { ImageData } from "../types";

interface CardProps {
  serviceName?: string;
  logoUrl?: string;
  image?: ImageData;
  isSelected?: boolean;
  onClick?: () => void;
}

export const Card = ({
  serviceName,
  logoUrl,
  image,
  isSelected = false,
  onClick,
}: CardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  if (image) {
    // 画像カード
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          cursor: "pointer",
          borderRadius: "4px",
          overflow: "visible",
          background: isSelected ? "#e3f2fd" : "#fff",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isHovered ? "scale(1.3)" : "scale(1)",
          boxShadow: isHovered ? "0 8px 24px rgba(0, 0, 0, 0.7)" : "none",
          zIndex: isHovered ? 10 : 1,
          position: "relative",
          width: "100%",
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            aspectRatio: "1",
            overflow: "hidden",
            background: "#f5f5f5",
            borderRadius: "4px 4px 0 0",
          }}
        >
          <img
            src={image.src}
            alt={image.alt || "Image"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: isHovered ? "scale(1.1)" : "scale(1)",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
        <div style={{ padding: "6px" }}>
          <div
            style={{
              fontSize: "10px",
              color: "#666",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={image.alt || "No title"}
          >
            {image.alt || "No title"}
          </div>
          <div
            style={{
              fontSize: "9px",
              color: "#999",
              marginTop: "2px",
            }}
          >
            {image.width} × {image.height}
          </div>
        </div>
      </div>
    );
  }

  // サービスロゴカード（既存の機能）
  return (
    <div className="card">
      <img src={logoUrl} alt={serviceName} />
    </div>
  );
};
