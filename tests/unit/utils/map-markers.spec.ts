import { describe, it, expect, vi } from 'vitest'
import { LocationType } from '~/types'
import { LOCATION_TYPE_COLORS } from '~/utils/constants'
import {
  MARKER_ANCHOR,
  MARKER_HEIGHT,
  MARKER_WIDTH,
  OUTLINE_WIDTH,
  PIN_BOUNDS,
  buildMarkerSvg,
  getMarkerIcon,
  resolveMarkerType,
} from '~/utils/map-markers'

const PREFIX = 'data:image/svg+xml;charset=UTF-8,'
const decode = (url: string) => decodeURIComponent(url.slice(PREFIX.length))

describe('getMarkerIcon', () => {
  it.each(Object.values(LocationType))('builds a valid icon for %s', (type) => {
    const icon = getMarkerIcon(type)

    expect(icon.url.startsWith(PREFIX)).toBe(true)
    expect(icon.url).not.toMatch(/[<>"#\s]/)
    const svg = decode(icon.url)
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
    expect(icon.color).toBe(LOCATION_TYPE_COLORS[type])
    expect(svg).toContain(`fill="${LOCATION_TYPE_COLORS[type]}"`)
    expect(icon.glyph.length).toBeGreaterThan(0)
  })

  it('uses a distinct glyph per category', () => {
    const glyphs = Object.values(LocationType).map((type) => getMarkerIcon(type).glyph)
    expect(new Set(glyphs).size).toBe(glyphs.length)
  })

  it('is larger than the old 20px dot and anchors the tip on the coordinate', () => {
    const icon = getMarkerIcon(LocationType.PARK)

    expect(icon.size).toEqual({ width: MARKER_WIDTH, height: MARKER_HEIGHT })
    expect(icon.size.width).toBeGreaterThan(20)
    expect(icon.size.height).toBeGreaterThan(20)
    expect(icon.anchor).toEqual(MARKER_ANCHOR)
    expect(icon.anchor.x).toBe(icon.size.width / 2)
    expect(icon.anchor.y).toBeLessThanOrEqual(icon.size.height)
    expect(decode(icon.url)).toContain(`M${MARKER_ANCHOR.x} ${MARKER_ANCHOR.y}`)
  })

  it('keeps the full outline stroke inside the viewBox and the anchor on the tip', () => {
    const half = OUTLINE_WIDTH / 2
    expect(PIN_BOUNDS.minX - half).toBeGreaterThanOrEqual(0)
    expect(PIN_BOUNDS.minY - half).toBeGreaterThanOrEqual(0)
    expect(PIN_BOUNDS.maxX + half).toBeLessThanOrEqual(MARKER_WIDTH)
    expect(PIN_BOUNDS.maxY + half).toBeLessThanOrEqual(MARKER_HEIGHT)
    expect(MARKER_ANCHOR.y).toBe(PIN_BOUNDS.maxY)
    expect(MARKER_ANCHOR.x).toBe((PIN_BOUNDS.minX + PIN_BOUNDS.maxX) / 2)
    expect(buildMarkerSvg(LocationType.PARK)).toContain(
      `viewBox="0 0 ${MARKER_WIDTH} ${MARKER_HEIGHT}"`
    )
  })

  it('draws the restaurant glyph with filled shapes', () => {
    const glyph = getMarkerIcon(LocationType.RESTAURANT).glyph
    expect(glyph).toMatch(/<rect /)
    expect(glyph).not.toMatch(/^<path d="M6 3v7/)
  })

  it('draws a white ring and dark outer edge for contrast', () => {
    const svg = buildMarkerSvg(LocationType.CAFE)
    expect(svg).toContain('stroke="#ffffff"')
    expect(svg).toContain('stroke="#111827"')
  })

  it('does not share anchor state between icons', () => {
    const icon = getMarkerIcon(LocationType.BAR)
    icon.anchor.x = 0
    expect(getMarkerIcon(LocationType.BAR).anchor.x).toBe(MARKER_ANCHOR.x)
  })

  it.each([undefined, null, '', 'UNKNOWN', 'toString'])('falls back to OTHER for %s', (value) => {
    expect(resolveMarkerType(value as string)).toBe(LocationType.OTHER)
    expect(getMarkerIcon(value as string)).toEqual(getMarkerIcon(LocationType.OTHER))
  })
})

describe('getSearchResultMarkerIcon', () => {
  it('is a distinct blue pin with the standard geometry', async () => {
    const { getSearchResultMarkerIcon, getMarkerIcon } = await import('~/utils/map-markers')
    const icon = getSearchResultMarkerIcon()

    expect(icon.url.startsWith('data:image/svg+xml')).toBe(true)
    expect(icon.size).toEqual(getMarkerIcon('PARK').size)
    expect(icon.anchor).toEqual(getMarkerIcon('PARK').anchor)
    expect(icon.url).not.toBe(getMarkerIcon('OTHER').url)
  })
})

describe('toGoogleIcon', () => {
  it('wraps the icon definition in Google Size/Point objects', async () => {
    const { toGoogleIcon } = await import('~/utils/map-markers')
    const Size = vi.fn(function (this: object, w: number, h: number) {
      Object.assign(this, { w, h })
    })
    const Point = vi.fn(function (this: object, x: number, y: number) {
      Object.assign(this, { x, y })
    })
    vi.stubGlobal('google', { maps: { Size, Point } })

    const icon = toGoogleIcon(getMarkerIcon(LocationType.PARK))

    expect(icon.url.startsWith(PREFIX)).toBe(true)
    expect(Size).toHaveBeenCalledWith(MARKER_WIDTH, MARKER_HEIGHT)
    expect(Point).toHaveBeenCalledWith(MARKER_ANCHOR.x, MARKER_ANCHOR.y)
    vi.unstubAllGlobals()
  })
})
