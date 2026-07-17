type LogoProps = {
  size?: number;
  title?: string;
};

/**
 * App mark for the RAG demo: two citation brackets embracing a grounded node.
 * The bracket-and-dot echoes the product's signature — every answer is a token
 * cited as [n]. Inline SVG so it stays crisp from favicon size up and needs no
 * external asset under the CSP.
 */
export function Logo({ size = 40, title }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id="ragTileGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#17a37d" />
          <stop offset="0.55" stopColor="#0e7a5f" />
          <stop offset="1" stopColor="#0b6551" />
        </linearGradient>
        <radialGradient id="ragTileGloss" cx="0.3" cy="0.12" r="0.9">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#ragTileGradient)" />
      <rect width="40" height="40" rx="11" fill="url(#ragTileGloss)" />
      <path
        d="M17 12.5 H13 V27.5 H17"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23 12.5 H27 V27.5 H23"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="20" r="3" fill="#7fd4b8" />
    </svg>
  );
}
