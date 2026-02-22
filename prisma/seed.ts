import { PrismaClient, LocationType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Starting database seed...')

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
      name: 'Central Park Dog Run',
      type: LocationType.PARK,
      description: 'Large off-leash area in the heart of the city. Water stations and waste bags provided.',
      address: 'Central Park, New York, NY 10024',
      latitude: 40.7736,
      longitude: -73.9712,
      website: 'https://www.centralparknyc.org',
      phone: '+1 212-310-6600',
      hours: '6:00 AM - 11:00 PM',
      leashRequired: false,
      offLeashArea: true,
      amenities: JSON.stringify(['Water bowls', 'Waste bags', 'Shade']),
      createdById: testUser.id,
    },
    {
      name: 'Bark Avenue Cafe',
      type: LocationType.CAFE,
      description: 'Dog-friendly cafe with outdoor seating and a special treat menu for pups.',
      address: '123 5th Avenue, New York, NY 10001',
      latitude: 40.7549,
      longitude: -73.9840,
      website: 'https://barkavenuecafe.com',
      phone: '+1 212-555-0123',
      hours: '7:00 AM - 9:00 PM',
      leashRequired: true,
      offLeashArea: false,
      amenities: JSON.stringify(['Dog treats', 'Dog menu', 'Patio', 'Water bowls']),
      createdById: testUser.id,
    },
    {
      name: 'Paws & Relax Spa',
      type: LocationType.GROOMER,
      description: 'Full-service dog grooming spa with organic products.',
      address: '456 Broadway, New York, NY 10012',
      latitude: 40.7198,
      longitude: -73.9973,
      website: 'https://pawsandrelax.com',
      phone: '+1 212-555-0456',
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

