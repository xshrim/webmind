export interface ScreenshotSelection {
  left: number;
  top: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface ScreenshotCrop {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
}

export function screenshotCrop(
  imageWidth: number,
  imageHeight: number,
  selection: ScreenshotSelection
): ScreenshotCrop {
  const viewportWidth = Math.max(1, selection.viewportWidth);
  const viewportHeight = Math.max(1, selection.viewportHeight);
  const left = Math.max(0, Math.min(viewportWidth, selection.left));
  const top = Math.max(0, Math.min(viewportHeight, selection.top));
  const right = Math.max(
    left,
    Math.min(viewportWidth, selection.left + selection.width)
  );
  const bottom = Math.max(
    top,
    Math.min(viewportHeight, selection.top + selection.height)
  );
  const scaleX = imageWidth / viewportWidth;
  const scaleY = imageHeight / viewportHeight;
  const sourceX = Math.round(left * scaleX);
  const sourceY = Math.round(top * scaleY);
  const sourceWidth = Math.max(
    1,
    Math.min(imageWidth - sourceX, Math.round((right - left) * scaleX))
  );
  const sourceHeight = Math.max(
    1,
    Math.min(imageHeight - sourceY, Math.round((bottom - top) * scaleY))
  );
  const maxSide = 2048;
  const outputScale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  return {
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    outputWidth: Math.max(1, Math.round(sourceWidth * outputScale)),
    outputHeight: Math.max(1, Math.round(sourceHeight * outputScale))
  };
}
