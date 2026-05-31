import { PrismaClient, LocationType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Starting database seed...')

  // Wipe location-related data so the seed is idempotent
  await prisma.comment.deleteMany({})
  await prisma.favorite.deleteMany({})
  await prisma.review.deleteMany({})
  await prisma.photo.deleteMany({})
  await prisma.location.deleteMany({})
  console.log('🧹 Cleared existing location data')

  // Create a test user first
  const testUser = await prisma.user.upsert({
    where: { clerkUserId: 'user_seed_test' },
    update: {},
    create: {
      clerkUserId: 'user_seed_test',
      email: 'test@example.com',
      username: 'TestUser',
    },
  })

  console.log('✅ Created test user')

  // Create sample locations
  const locations = [
    {
      name: 'Cubbon Park Dog Run',
      type: LocationType.PARK,
      description:
        'Spacious off-leash area inside Cubbon Park. Water stations and shaded walkways.',
      address: 'Cubbon Park, Kasturba Road, Bangalore 560001',
      latitude: 12.9763,
      longitude: 77.5929,
      website: 'https://horticulture.karnataka.gov.in',
      phone: '+91 80-2286-6483',
      hours: '6:00 AM - 8:00 PM',
      leashRequired: false,
      offLeashArea: true,
      amenities: JSON.stringify(['Water bowls', 'Waste bags', 'Shade']),
      createdById: testUser.id,
    },
    {
      name: 'The Barkery Cafe',
      type: LocationType.CAFE,
      description: 'Dog-friendly cafe in Indiranagar with outdoor seating and pup-friendly treats.',
      address: '100 Feet Road, Indiranagar, Bangalore 560038',
      latitude: 12.9784,
      longitude: 77.6408,
      website: 'https://thebarkery.in',
      phone: '+91 98765-43210',
      hours: '8:00 AM - 10:00 PM',
      leashRequired: true,
      offLeashArea: false,
      amenities: JSON.stringify(['Dog treats', 'Dog menu', 'Patio', 'Water bowls']),
      createdById: testUser.id,
    },
    {
      name: 'Paws & Groom Koramangala',
      type: LocationType.GROOMER,
      description: 'Full-service dog grooming salon in the heart of Koramangala.',
      address: '5th Block, Koramangala, Bangalore 560095',
      latitude: 12.9352,
      longitude: 77.6245,
      website: 'https://pawsandgroom.in',
      phone: '+91 99001-12345',
      hours: '9:00 AM - 7:00 PM',
      leashRequired: true,
      offLeashArea: false,
      amenities: JSON.stringify(['Dog treats']),
      createdById: testUser.id,
    },
  ]

  const createdLocations = []
  for (const locationData of locations) {
    const location = await prisma.location.create({
      data: locationData,
    })
    createdLocations.push(location)
    console.log(`✅ Created location: ${location.name}`)
  }

  // Create sample reviews
  if (createdLocations.length > 0) {
    await prisma.review.create({
      data: {
        rating: 5,
        comment: 'Amazing place for my pup! Love the off-leash area.',
        locationId: createdLocations[0].id,
        authorId: testUser.id,
      },
    })

    if (createdLocations.length > 1) {
      await prisma.review.create({
        data: {
          rating: 4,
          comment: 'Great coffee and friendly staff, but the outdoor seating can be noisy.',
          locationId: createdLocations[1].id,
          authorId: testUser.id,
        },
      })
    }

    console.log('✅ Created sample reviews')
  }

  console.log('✅ Database seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
