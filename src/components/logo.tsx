import * as React from "react";

export interface LogoProps extends React.SVGProps<SVGSVGElement> {}

export function Logo(props: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={80}
      height={80}
      fill="none"
      viewBox="0 0 80 80"
      {...props}
    >
      <g clipPath="url(#a-logo)">
        <rect width="80" height="80" fill="url(#b-logo)" rx="18.261" />
        <rect
          width="79"
          height="79"
          x="0.5"
          y="0.5"
          stroke="#fff"
          strokeOpacity="0.08"
          rx="17.761"
        />
        {/* Blurred background cube for glow effect */}
        <g filter="url(#c-logo)" style={{ mixBlendMode: "color-dodge" }}>
          <path
            fill="url(#d-logo)"
            fillOpacity={0.5}
            fillRule="evenodd"
            d="M40 15L60 26v28L40 65L20 54V26L40 15z M40 18L22 26.5v25L40 61L58 52.5v-25L40 18z M40 18v43M20 26L40 38L60 26M40 38v23"
            clipRule="evenodd"
          />
        </g>
        {/* Main cube */}
        <g>
          {/* Top face */}
          <path
            fill="url(#e-logo)"
            stroke="url(#f-logo)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            d="M40 18L58 27L40 36L22 27L40 18z"
          />
          {/* Left face */}
          <path
            fill="url(#g-logo)"
            stroke="url(#f-logo)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            d="M22 27v25L40 61V36L22 27z"
          />
          {/* Right face */}
          <path
            fill="url(#h-logo)"
            stroke="url(#f-logo)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            d="M40 36v25L58 52V27L40 36z"
          />
        </g>
      </g>
      <defs>
        {/* Background gradient */}
        <linearGradient
          id="b-logo"
          x1="40"
          x2="40"
          y1="0"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#272727" />
          <stop offset={1} stopColor="#141414" />
        </linearGradient>
        {/* Glow effect gradient */}
        <linearGradient
          id="d-logo"
          x1="65.652"
          x2="13.043"
          y1="12.174"
          y2="81.522"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6366F1" />
          <stop offset={0.5} stopColor="#8B5CF6" />
          <stop offset={1} stopColor="#A855F7" />
        </linearGradient>
        {/* Top face gradient (brightest - direct light) */}
        <linearGradient
          id="e-logo"
          x1="40"
          x2="40"
          y1="18"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A78BFA" />
          <stop offset={1} stopColor="#8B5CF6" />
        </linearGradient>
        {/* Left face gradient (medium - angled light) */}
        <linearGradient
          id="g-logo"
          x1="22"
          x2="40"
          y1="27"
          y2="61"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7C3AED" />
          <stop offset={1} stopColor="#5B21B6" />
        </linearGradient>
        {/* Right face gradient (darkest - in shadow) */}
        <linearGradient
          id="h-logo"
          x1="58"
          x2="40"
          y1="27"
          y2="61"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#5B21B6" />
          <stop offset={1} stopColor="#3B0764" />
        </linearGradient>
        {/* Stroke gradient */}
        <linearGradient
          id="f-logo"
          x1="40"
          x2="40"
          y1="18"
          y2="61"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C4B5FD" />
          <stop offset={0.5} stopColor="#A78BFA" />
          <stop offset={1} stopColor="#7C3AED" />
        </linearGradient>
        <clipPath id="a-logo">
          <path fill="#fff" d="M0 0h80v80H0z" />
        </clipPath>
        {/* Blur filter for glow effect */}
        <filter
          id="c-logo"
          width="60.435"
          height="78.261"
          x="10"
          y="8.696"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur
            result="effect1_foregroundBlur_1542_6865"
            stdDeviation={5.435}
          />
        </filter>
      </defs>
    </svg>
  );
}
