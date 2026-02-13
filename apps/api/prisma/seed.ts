import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client.js'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const db = new PrismaClient({ adapter })

const rings = [
  {
    name: 'Classic Solitaire Diamond',
    description:
      'A timeless solitaire setting featuring a brilliant round diamond on a polished yellow gold band. The epitome of elegance and simplicity.',
    metalType: 'YELLOW_GOLD' as const,
    stoneType: 'DIAMOND' as const,
    caratWeight: 1.5,
    style: 'SOLITAIRE' as const,
    rating: 4.8,
    reviewCount: 124,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop',
        position: 0,
      },
      {
        url: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?w=800&auto=format&fit=crop',
        position: 1,
      },
    ],
  },
  {
    name: 'Rose Gold Halo Sapphire',
    description:
      'A stunning sapphire center stone surrounded by a sparkling halo of diamonds, set on a delicate rose gold band. Romantic and eye-catching.',
    metalType: 'ROSE_GOLD' as const,
    stoneType: 'SAPPHIRE' as const,
    caratWeight: 2.0,
    style: 'HALO' as const,
    rating: 4.6,
    reviewCount: 89,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&auto=format&fit=crop',
        position: 0,
      },
      {
        url: 'https://images.unsplash.com/photo-1514986888952-8cd320577b68?w=800&auto=format&fit=crop',
        position: 1,
      },
    ],
  },
  {
    name: 'Platinum Vintage Emerald',
    description:
      'An emerald-cut emerald in a vintage-inspired platinum setting with milgrain detailing and side baguette diamonds. Unique and regal.',
    metalType: 'PLATINUM' as const,
    stoneType: 'EMERALD' as const,
    caratWeight: 1.2,
    style: 'VINTAGE' as const,
    rating: 4.9,
    reviewCount: 67,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop',
        position: 0,
      },
      {
        url: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&auto=format&fit=crop',
        position: 1,
      },
    ],
  },
]

async function main() {
  console.log('Seeding database...')

  // Clear existing seed data (images cascade-deleted with rings)
  await db.ringImage.deleteMany()
  await db.ring.deleteMany()
  console.log('  Cleared existing rings')

  for (const { images, ...ringData } of rings) {
    const created = await db.ring.create({
      data: {
        ...ringData,
        images: {
          create: images,
        },
      },
      include: { images: true },
    })
    console.log(
      `  Created ring: ${created.name} (${created.id}) with ${created.images.length} images`,
    )
  }

  const count = await db.ring.count()
  console.log(`Seeding complete. Total rings: ${count}`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
