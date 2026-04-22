import { h, JSX } from "preact";

export const Button = ({
  children,
  onClick,
  style,
}: {
  children: string;
  onClick: () => void;
  style?: JSX.CSSProperties;
  fullWidth?: boolean;
  secondary?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) => {
  return (
    <button onClick={onClick} style={style}>
      {children}
    </button>
  );
};
