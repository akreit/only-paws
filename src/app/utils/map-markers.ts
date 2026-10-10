import { LocationType } from '~/types'
import { LOCATION_TYPE_COLORS } from '~/utils/constants'

export interface MarkerIconDefinition {
  /** `data:image/svg+xml` URL of the pin */
  url: string
  size: { width: number; height: number }
  /** Pixel inside the image that sits on the map coordinate (the pin tip) */
  anchor: { x: number; y: number }
  color: string
  glyph: string
}

export const MARKER_WIDTH = 36
export const MARKER_HEIGHT = 50
export const MARKER_ANCHOR = { x: 18, y: 46 }
export const OUTLINE_WIDTH = 5.5
/** Extent of the pin path; the outline stroke extends OUTLINE_WIDTH / 2 beyond it */
export const PIN_BOUNDS = { minX: 3, maxX: 33, minY: 3, maxY: 46 }
const OUTLINE_COLOR = '#111827'

const PIN_PATH = 'M18 46C18 46 3 30 3 18a15 15 0 0 1 30 0C33 30 18 46 18 46Z'

// White glyphs drawn in a 24x24 box, centred in the pin head
const PAW =
  '<ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="5.5" cy="11" r="2"/><circle cx="9" cy="6.5" r="2"/><circle cx="15" cy="6.5" r="2"/><circle cx="18.5" cy="11" r="2"/>'

const MARKER_GLYPHS: Record<LocationType, string> = {
  [LocationType.RESTAURANT]:
    '<rect x="5" y="3" width="1.6" height="7"/><rect x="8.2" y="3" width="1.6" height="7"/><rect x="11.4" y="3" width="1.6" height="7"/><rect x="5" y="9" width="8" height="2.2" rx="1"/><rect x="8" y="10" width="2" height="11" rx=".8"/><path d="M16.5 21V3c2.5 1 4 4 4 8h-2.5v10z"/>',
  [LocationType.PARK]:
    '<path d="M12 2 5 12h4l-4 6h14l-4-6h4z"/><rect x="10.5" y="18" width="3" height="4"/>',
  [LocationType.STORE]:
    '<path d="M3 9 5 3h14l2 6zM5 11h14v10H5z"/><rect x="10" y="15" width="4" height="6" fill="#111827" fill-opacity=".35"/>',
  [LocationType.HOTEL]:
    '<rect x="3" y="16" width="18" height="3"/><rect x="3" y="7" width="2.5" height="12"/><rect x="5.5" y="11" width="15.5" height="5"/><circle cx="8.5" cy="9.5" r="2"/>',
  [LocationType.BEACH]:
    '<circle cx="16" cy="7" r="3.5"/><path d="M2 15q3-3 5 0t5 0 5 0 5 0v3q-3 3-5 0t-5 0-5 0-5 0z"/>',
  [LocationType.CAFE]:
    '<path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2" fill="none" stroke="#fff" stroke-width="2"/><rect x="3" y="20" width="14" height="2"/>',
  [LocationType.BAR]: '<path d="M3 4h18l-9 10zM11 14h2v6h-2zM7 20h10v2H7z"/>',
  [LocationType.TRAINING_CENTER]:
    '<path d="m12 2 2.9 6.3 6.9.7-5.1 4.6 1.5 6.8L12 17l-6.2 3.4 1.5-6.8L2.2 9l6.9-.7z"/>',
  [LocationType.GROOMER]:
    '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M7.5 15.5 17 3h3L9.5 16zM16.5 15.5 7 3H4l10.5 13z"/>',
  [LocationType.VETERINARIAN]: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  [LocationType.OTHER]: PAW,
}

/** Falls back to OTHER when the value is not a known LocationType. */
export function resolveMarkerType(type: LocationType | string | null | undefined): LocationType {
  return Object.prototype.hasOwnProperty.call(MARKER_GLYPHS, type as string)
    ? (type as LocationType)
    : LocationType.OTHER
}

export function buildMarkerSvg(type: LocationType | string | null | undefined): string {
  const resolved = resolveMarkerType(type)
  const color = LOCATION_TYPE_COLORS[resolved]

  // Dark outer edge + white ring keep the pin readable on light and dark maps
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MARKER_WIDTH}" height="${MARKER_HEIGHT}" viewBox="0 0 ${MARKER_WIDTH} ${MARKER_HEIGHT}">` +
    `<path d="${PIN_PATH}" fill="none" stroke="${OUTLINE_COLOR}" stroke-opacity=".85" stroke-width="${OUTLINE_WIDTH}" stroke-linejoin="round"/>` +
    `<path d="${PIN_PATH}" fill="${color}" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<g transform="translate(6.6 6.6) scale(.9)" fill="#ffffff">${MARKER_GLYPHS[resolved]}</g>` +
    `</svg>`
  )
}

export function getMarkerIcon(
  type: LocationType | string | null | undefined
): MarkerIconDefinition {
  const resolved = resolveMarkerType(type)

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildMarkerSvg(resolved))}`,
    size: { width: MARKER_WIDTH, height: MARKER_HEIGHT },
    anchor: { ...MARKER_ANCHOR },
    color: LOCATION_TYPE_COLORS[resolved],
    glyph: MARKER_GLYPHS[resolved],
  }
}
