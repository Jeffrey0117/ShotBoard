/**
 * Cover Layout Component
 * @module components/Slides/layouts/CoverLayout
 * @description Full-page cover layout, typically for title slides
 */

import React from 'react';
import type { SlideTheme } from '../../../types/slide';

export interface LayoutProps {
  children: React.ReactNode;
  theme: SlideTheme;
  className?: string;
  style?: React.CSSProperties;
}

export const CoverLayout: React.FC<LayoutProps> = ({
  children,
  theme,
  className = '',
  style,
}) => {
  return (
    <div
      className={`slide-layout slide-layout--cover ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        padding: theme.spacing.slidePadding,
        gap: theme.spacing.sectionGap,
        textAlign: 'center',
        background: `linear-gradient(135deg, ${theme.colors.primary}22 0%, ${theme.colors.background} 100%)`,
        ...theme.layouts?.cover,
        ...style,
      }}
    >
      <div className="slide-cover-content">
        {children}
      </div>
    </div>
  );
};

export default CoverLayout;
