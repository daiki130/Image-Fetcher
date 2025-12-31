import { h } from "preact";
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
  if (image) {
    // 画像カード
    return (
      <div
        onClick={onClick}
        style={{
          cursor: "pointer",
          borderRadius: "4px",
          overflow: "hidden",
          background: isSelected ? "#e3f2fd" : "#fff",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.borderColor = "#18A0FB";
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.borderColor = "#e0e0e0";
          }
        }}
      >
        <div
          style={{
            width: "100%",
            aspectRatio: "1",
            overflow: "hidden",
            background: "#f5f5f5",
          }}
        >
          <img
            src={image.src}
            alt={image.alt || "Image"}
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
