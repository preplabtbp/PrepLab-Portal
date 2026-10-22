import React from 'react';

export interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  title?: string;
  showLabel?: boolean;
  label?: string;
}

/**
 * VerifiedBadge Component
 * Displays the official 16-point scalloped blue gradient badge with white checkmark.
 */
export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'sm',
  className = '',
  title = 'Terverifikasi Resmi',
  showLabel = false,
  label = 'Terverifikasi',
}) => {
  const sizeMap: Record<string, string> = {
    xs: 'w-3.5 h-3.5 min-w-[14px]',
    sm: 'w-4 h-4 min-w-[16px]',
    md: 'w-4.5 h-4.5 min-w-[18px]',
    lg: 'w-5 h-5 min-w-[20px]',
    xl: 'w-6 h-6 min-w-[24px]',
  };

  const resolvedSizeClass = typeof size === 'number' ? '' : (sizeMap[size] || sizeMap.sm);
  const inlineStyle = typeof size === 'number' ? { width: size, height: size } : undefined;

  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 select-none align-middle ${className}`}
      title={title}
    >
      <img
        src="/verified-badge.png"
        alt={title}
        style={inlineStyle}
        className={`${resolvedSizeClass} object-contain inline-block shrink-0 drop-shadow-[0_1px_2px_rgba(29,155,240,0.3)] transition-transform hover:scale-110`}
        loading="eager"
        decoding="async"
        draggable={false}
      />
      {showLabel && (
        <span className="font-semibold text-sky-600 dark:text-sky-400 text-xs">
          {label}
        </span>
      )}
    </span>
  );
};

export default VerifiedBadge;
