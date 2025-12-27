/**
 * Default Layout Component
 * @module components/Slides/layouts/DefaultLayout
 * @description Standard layout with title and content stacked vertically
 */

import React from 'react';
import type { SlideTheme } from '../../../types/slide';

export interface LayoutProps {
  children: React.ReactNode;
  theme: SlideTheme;
  className?: string;
  style?: React.CSSProperties;
}

export const DefaultLayout: React.FC<LayoutProps> = ({
  children,
  theme,
  className = '',
  style,
}) => {
  return (
    <div
      className={`slide-layout slide-layout--default ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        width: '100%',
        height: '100%',
        padding: theme.spacing.slidePadding,
        gap: theme.spacing.contentGap,
        ...theme.layouts?.default,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default DefaultLayout;
