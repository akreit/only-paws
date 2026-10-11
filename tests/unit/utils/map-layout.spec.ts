import { describe, expect, it } from 'vitest'
import { mapSheetInset } from '~/utils/map-layout'

describe('mapSheetInset', () => {
  it('returns the rounded height on mobile with the panel open', () => {
    expect(mapSheetInset({ isMobile: true, open: true, height: 240.6 })).toBe(241)
  })

  it('returns 0 on desktop', () => {
    expect(mapSheetInset({ isMobile: false, open: true, height: 240 })).toBe(0)
  })

  it('returns 0 when the panel is closed', () => {
    expect(mapSheetInset({ isMobile: true, open: false, height: 240 })).toBe(0)
  })

  it('returns 0 for unusable heights', () => {
    expect(mapSheetInset({ isMobile: true, open: true, height: 0 })).toBe(0)
    expect(mapSheetInset({ isMobile: true, open: true, height: -5 })).toBe(0)
    expect(mapSheetInset({ isMobile: true, open: true, height: NaN })).toBe(0)
  })
})
