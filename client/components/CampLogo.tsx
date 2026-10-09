import logoSrc from "@/assets/camp-ascent-logo.webp";

type CampLogoProps = {
  /** Rendered width/height in px (logo is roughly square) */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

/** The cAMP Ascent logo. Single source so every placement stays consistent. */
export default function CampLogo({ size = 40, className, style }: CampLogoProps) {
  return (
    <img
      src={logoSrc}
      alt="cAMP Ascent"
      width={size}
      height={size}
      draggable={false}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", ...style }}
    />
  );
}

export { logoSrc as campLogoSrc };
