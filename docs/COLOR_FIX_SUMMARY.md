# Recording Color Mismatch Fix

## Problem
Recorded video colors didn't match what users see on screen. The background appeared as light purple instead of dark blue (#1a1a2e).

## Root Cause
Excalidraw implements dark mode using **CSS filters**, not actual dark pixels:

```css
filter: invert(0.93) hue-rotate(180deg)
```

This means:
- The actual canvas pixels are **light colored** (inverted)
- The CSS filter transforms them to appear **dark** in the browser
- When `drawImage()` copies the canvas, it captures **raw pixels without CSS filters**

## Why Previous Fixes Failed

| Approach | Why It Failed |
|----------|---------------|
| `colorSpace: 'srgb'` | Color space was already correct |
| `alpha: false` | Transparency wasn't the issue |
| Higher bitrate | Encoding was fine |
| `willReadFrequently` | Read optimization doesn't affect rendering |

## Solution
Apply the same CSS filter programmatically in the compositor:

```typescript
// compositor.ts - drawFrame()
if (this.intermediateCtx) {
  // Apply Excalidraw's dark mode filter
  this.intermediateCtx.filter = 'invert(0.93) hue-rotate(180deg)';
  this.intermediateCtx.drawImage(sourceCanvas, 0, 0);
  this.intermediateCtx.filter = 'none';

  // Draw filtered result to output
  ctx.drawImage(this.intermediateCanvas, 0, 0, canvas.width, canvas.height);
}
```

## Key Insight
`canvas.getContext('2d').filter` accepts the same CSS filter syntax as CSS `filter` property. This allows programmatic application of visual transforms that CSS applies to DOM elements.

## Files Changed
- `src/utils/compositor.ts` - Added intermediate canvas with filter application
