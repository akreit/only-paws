import { describe, expect, it } from 'vitest'
import {
  PEOPLE_RADII_KM,
  boundingBox,
  bucketDistance,
  distanceBucketKm,
  LOOKING_FOR_VALUES,
  approximateLocation,
  haversineKm,
  parsePeopleQuery,
  randomJitter,
  roundToApprox,
} from '#shared/utils/people'

describe('roundToApprox', () => {
  it('rounds latitude to 0.01 degrees', () => {
    expect(roundToApprox(52.520008, 0).latitude).toBe(52.52)
    expect(roundToApprox(-33.8688, 0).latitude).toBe(-33.87)
  })

  it('uses a plain 0.01 degree longitude step at the equator', () => {
    expect(roundToApprox(0, 13.404954)).toEqual({ latitude: 0, longitude: 13.4 })
    expect(roundToApprox(0, -9.87654321).longitude).toBe(-9.88)
  })

  it('widens the longitude step by 1/cos(latitude) so cells stay ~1.1 km wide', () => {
    for (const lat of [0, 50, 70]) {
      const step = 0.01 / Math.cos((lat * Math.PI) / 180)
      const { longitude } = roundToApprox(lat, 10)
      // The result sits on the cos-scaled grid and within half a step of the input
      expect(Math.abs(longitude - 10)).toBeLessThanOrEqual(step / 2 + 1e-4)
      expect(Math.abs(longitude / step - Math.round(longitude / step))).toBeLessThan(0.01)
    }
  })

  it.each([0, 50, 70])('makes cells ~1.1 km wide at %d° latitude', (lat) => {
    const step = 0.01 / Math.cos((lat * Math.PI) / 180)
    const a = roundToApprox(lat, 10)
    const b = roundToApprox(lat, a.longitude + step)
    const widthKm = haversineKm(a.latitude, a.longitude, a.latitude, b.longitude)
    expect(widthKm).toBeGreaterThan(1.0)
    expect(widthKm).toBeLessThan(1.2)
  })

  it('derives the step from the rounded latitude and floors cos near the poles', () => {
    expect(roundToApprox(89.999, 10).latitude).toBe(90)
    expect(Number.isFinite(roundToApprox(90, 10).longitude)).toBe(true)
  })
})

describe('randomJitter', () => {
  it('is uniform in ±0.005 degrees of latitude', () => {
    expect(randomJitter(0, () => 0)).toEqual({ lat: -0.005, lng: -0.005 })
    expect(randomJitter(0, () => 0.5)).toEqual({ lat: 0, lng: 0 })
    expect(randomJitter(0, () => 0.999999).lat).toBeLessThan(0.005)
  })

  it('scales the longitude offset by the cell width factor', () => {
    const { lat, lng } = randomJitter(60, () => 0)
    expect(lat).toBeCloseTo(-0.005)
    expect(lng).toBeCloseTo(-0.01, 4)
  })

  it('uses Math.random by default and stays in bounds', () => {
    for (let i = 0; i < 50; i++) {
      const { lat, lng } = randomJitter(70)
      expect(Math.abs(lat)).toBeLessThanOrEqual(0.005)
      expect(Math.abs(lng)).toBeLessThanOrEqual(0.005 / Math.cos((70 * Math.PI) / 180) + 1e-9)
    }
  })
})

describe('approximateLocation', () => {
  it('adds the jitter to the cell and rounds to 4 decimals', () => {
    const result = approximateLocation(52.520008, 13.404954, { lat: 0.00123456, lng: -0.002 })
    expect(result.latitude).toBe(52.5212)
    expect(result.longitude).toBeCloseTo(roundToApprox(52.520008, 13.404954).longitude - 0.002, 4)
    expect(String(result.longitude).split('.')[1]!.length).toBeLessThanOrEqual(4)
  })

  it('clamps to valid coordinate ranges', () => {
    expect(approximateLocation(90, 180, { lat: 0.005, lng: 0.005 })).toEqual({
      latitude: 90,
      longitude: 180,
    })
    expect(approximateLocation(-90, -180, { lat: -0.005, lng: -0.005 })).toEqual({
      latitude: -90,
      longitude: -180,
    })
  })
})

describe('parsePeopleQuery', () => {
  it('applies defaults', () => {
    expect(parsePeopleQuery({})).toEqual({
      ok: true,
      value: { radius: 10, page: 1, pageSize: 20, breed: '', lookingFor: [], hasDog: false },
    })
  })

  it('parses every field, accepts arrays and trims', () => {
    expect(
      parsePeopleQuery({
        radius: ['5'],
        page: '2',
        pageSize: '50',
        breed: ' Beagle ',
        lookingFor: 'FRIENDS, TIPS,',
        hasDog: 'true',
      })
    ).toEqual({
      ok: true,
      value: {
        radius: 5,
        page: 2,
        pageSize: 50,
        breed: 'Beagle',
        lookingFor: ['FRIENDS', 'TIPS'],
        hasDog: true,
      },
    })
  })

  it('treats empty strings as unset and non-string values as absent', () => {
    expect(parsePeopleQuery({ radius: '', page: '', breed: 5, hasDog: 'yes' })).toMatchObject({
      ok: true,
      value: { radius: 10, page: 1, breed: '', hasDog: false },
    })
  })

  it.each([
    [{ radius: '3' }, 'use one of'],
    [{ radius: 'abc' }, 'Invalid radius'],
    [{ page: '0' }, 'Invalid page'],
    [{ page: '1.5' }, 'Invalid page'],
    [{ pageSize: '51' }, 'Invalid pageSize'],
    [{ pageSize: '0' }, 'Invalid pageSize'],
    [{ lookingFor: 'FRIENDS,CATS' }, 'Invalid lookingFor'],
    [{ breed: 'x'.repeat(51) }, 'at most 50'],
  ])('rejects %j', (query, message) => {
    expect(parsePeopleQuery(query)).toEqual({ ok: false, error: expect.stringContaining(message) })
  })

  it('exposes the looking-for values', () => {
    expect([...LOOKING_FOR_VALUES]).toEqual(['FRIENDS', 'PLACES', 'TIPS', 'PLAYDATES'])
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
