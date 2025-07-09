import * as React from "react";

export interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

export function Logo(props: LogoProps) {
  return <img src="/logo-white.png" alt="Logo" {...props} />;
}
