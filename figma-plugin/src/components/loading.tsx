import { h } from "preact";
import { Text } from "@create-figma-plugin/ui";

interface LoadingProps {
  message: string;
  progress?: number; // 0-100の進捗率
}

export const Loading: React.FC<LoadingProps> = ({ message, progress }) => {
  return (
    <div
      style={{
        padding: "var(--space-medium)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-small)",
        alignItems: "center",
        fontFamily: "Menlo",
      }}
    >
      <Text>{message}</Text>
      {progress !== undefined && (
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "var(--figma-color-bg-tertiary)",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: "var(--figma-color-bg-brand)",
                transition: "width 0.2s ease-out",
              }}
            />
          </div>
          <Text
            style={{
              fontSize: "12px",
              color: "var(--figma-color-text-secondary)",
              textAlign: "center",
            }}
          >
            {progress}%
          </Text>
        </div>
      )}
    </div>
  );
};
