/**
 * Center Layout Component
 * @module components/Slides/layouts/CenterLayout
 * @description Centered content layout
 */

import React from 'react';
import type { SlideTheme } from '../../../types/slide';

export interface LayoutProps {
  children: React.ReactNode;
  theme: SlideTheme;
  className?: string;
  style?: React.CSSProperties;
}

export const CenterLayout: React.FC<LayoutProps> = ({
  children,
  theme,
  className = '',
  style,
}) => {
  return (
    <div
      className={`slide-layout slide-layout--center ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        padding: theme.spacing.slidePadding,
        gap: theme.spacing.contentGap,
        textAlign: 'center',
        ...theme.layouts?.center,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default CenterLayout;
