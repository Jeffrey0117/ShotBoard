/**
 * Two Columns Layout Component
 * @module components/Slides/layouts/TwoColsLayout
 * @description Two-column layout for side-by-side content
 */

import React from 'react';
import type { SlideTheme } from '../../../types/slide';

export interface LayoutProps {
  children: React.ReactNode;
  theme: SlideTheme;
  className?: string;
  style?: React.CSSProperties;
}

export const TwoColsLayout: React.FC<LayoutProps> = ({
  children,
  theme,
  className = '',
  style,
}) => {
  // Split children into left and right columns
  // Convention: Use <div class="col-left"> and <div class="col-right">
  // Or if just two children, first goes left, second goes right
  const childArray = React.Children.toArray(children);

  return (
    <div
      className={`slide-layout slide-layout--two-cols ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        width: '100%',
        height: '100%',
        padding: theme.spacing.slidePadding,
        gap: theme.spacing.contentGap,
        ...theme.layouts?.['two-cols'],
        ...style,
      }}
    >
      {childArray.length === 2 ? (
        <>
          <div className="slide-col slide-col--left" style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.contentGap }}>
            {childArray[0]}
          </div>
          <div className="slide-col slide-col--right" style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.contentGap }}>
            {childArray[1]}
          </div>
        </>
      ) : (
        <div className="slide-col slide-col--full" style={{ gridColumn: '1 / -1' }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default TwoColsLayout;
