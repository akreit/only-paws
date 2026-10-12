import { describe, expect, it } from 'vitest'
import {
  PEOPLE_RADII_KM,
  boundingBox,
  bucketDistance,
  distanceBucketKm,
  haversineKm,
  roundToApprox,
} from '#shared/utils/people'

describe('roundToApprox', () => {
  it('rounds to 0.01 degrees', () => {
    expect(roundToApprox(52.520008, 13.404954)).toEqual({ latitude: 52.52, longitude: 13.4 })
    expect(roundToApprox(-33.8688, 151.2093)).toEqual({ latitude: -33.87, longitude: 151.21 })
  })

  it('never keeps more than two decimals', () => {
    const { latitude, longitude } = roundToApprox(1.23456789, -9.87654321)
    expect(latitude).toBe(1.23)
    expect(longitude).toBe(-9.88)
  })
})

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(52.5, 13.4, 52.5, 13.4)).toBe(0)
  })

  it('matches a known distance (Berlin to Hamburg ~255 km)', () => {
    expect(haversineKm(52.52, 13.405, 53.5511, 9.9937)).toBeGreaterThan(250)
    expect(haversineKm(52.52, 13.405, 53.5511, 9.9937)).toBeLessThan(260)
  })
})

describe('bucketDistance', () => {
  it.each([
    [0, '< 1 km'],
    [0.99, '< 1 km'],
    [1.5, '~2 km'],
    [2.5, '~3 km'],
    [4, '~5 km'],
    [7, '~10 km'],
    [12, '~15 km'],
    [20, '~25 km'],
    [26, '> 25 km'],
  ])('labels %s km as %s', (km, label) => {
    expect(bucketDistance(km)).toBe(label)
  })

  it('exposes the numeric bucket', () => {
    expect(distanceBucketKm(2.5)).toBe(3)
    expect(distanceBucketKm(99)).toBe(Infinity)
  })
})

describe('boundingBox', () => {
  it('contains every point within the radius', () => {
    const box = boundingBox(52.5, 13.4, 10)
    expect(box.minLat).toBeLessThan(52.5 - 0.08)
    expect(box.maxLat).toBeGreaterThan(52.5 + 0.08)
    expect(box.minLng).toBeLessThan(13.4)
    expect(box.maxLng).toBeGreaterThan(13.4)
    // A point ~10 km due east must be inside
    const east = 13.4 + 10 / (111.32 * Math.cos((52.5 * Math.PI) / 180))
    expect(east).toBeLessThanOrEqual(box.maxLng)
  })

  it('clamps at the poles and the antimeridian', () => {
    const box = boundingBox(89.99, 179.99, 25)
    expect(box.maxLat).toBe(90)
    expect(box.maxLng).toBe(180)
  })
})

describe('PEOPLE_RADII_KM', () => {
  it('offers the documented radii', () => {
    expect([...PEOPLE_RADII_KM]).toEqual([2, 5, 10, 25])
  })
})
