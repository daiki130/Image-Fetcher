import { h } from "preact";
import "../styles.css";

export const Toogle = ({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) => {
  return (
    <div>
      <div
        style={{
          width: 32,
          height: 16,
          backgroundColor: value ? "#21DA6E" : "var(--figma-color-bg-tertiary)",
          borderRadius: 10,
          position: "relative",
        }}
        onClick={() => onChange(!value)}
      >
        <div
          style={{
            width: 14,
            height: 14,
            backgroundColor: "#fff",
            borderRadius: 10,
            position: "absolute",
            top: 1,
            left: value ? 17 : 1,
            transition: "all 0.2s ease",
          }}
        />
      </div>
    </div>
  );
};
