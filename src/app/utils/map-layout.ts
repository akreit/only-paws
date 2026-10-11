/** Height (px) the map must give up to the mobile bottom sheet; 0 when no sheet covers it. */
export function mapSheetInset({
  isMobile,
  open,
  height,
}: {
  isMobile: boolean
  open: boolean
  height: number
}): number {
  if (!isMobile || !open || !Number.isFinite(height) || height <= 0) return 0
  return Math.round(height)
}
