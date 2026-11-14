import { asset } from "./asset";
/* Static Figma icon/asset from /public/figma. The SVGs carry their own width/height; size sets the slot box. */
export function Icon({ name, size, className }: { name: string; size: number; className?: string }) {
  return (
    <span className={className} style={{ position: "relative", display: "block", width: size, height: size, flexShrink: 0 }}>
      <img alt="" src={asset(`/figma/${name}.svg`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </span>
  );
}

/* Asset whose SVG bleeds past its slot (shadows): wrapper with negative insets, as exported by Figma. */
export function BleedAsset({ src, inset, className, style }: { src: string; inset: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={style}>
      <div style={{ position: "absolute", inset }}>
        <img alt="" src={src} style={{ width: "100%", height: "100%", maxWidth: "none" }} />
      </div>
    </div>
  );
}
