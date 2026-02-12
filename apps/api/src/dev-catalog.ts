import type { PrismaClient } from '../prisma/generated/prisma/client.js'

export async function seedDevCatalog(db: PrismaClient) {
  const existing = await db.ring.count()
  if (existing > 0) return

  await db.ring.create({
    data: {
      name: 'Aurora Solitaire',
      description:
        'A timeless solitaire setting featuring a brilliant round diamond on a polished platinum band. Clean lines and understated elegance.',
      metalType: 'PLATINUM',
      stoneType: 'DIAMOND',
      caratWeight: 1.5,
      style: 'SOLITAIRE',
      rating: 4.8,
      reviewCount: 124,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
            position: 0,
          },
          {
            url: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800',
            position: 1,
          },
        ],
      },
    },
  })

  await db.ring.create({
    data: {
      name: 'Rose Garden Halo',
      description:
        'A romantic halo setting with a cushion-cut morganite center stone surrounded by pavé diamonds on a rose gold band.',
      metalType: 'ROSE_GOLD',
      stoneType: 'MORGANITE',
      caratWeight: 2.0,
      style: 'HALO',
      rating: 4.6,
      reviewCount: 89,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800',
            position: 0,
          },
          {
            url: 'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?w=800',
            position: 1,
          },
        ],
      },
    },
  })

  await db.ring.create({
    data: {
      name: 'Vintage Sapphire Trio',
      description:
        'An art deco-inspired three-stone ring with a deep blue sapphire flanked by two tapered baguette diamonds on a white gold band.',
      metalType: 'WHITE_GOLD',
      stoneType: 'SAPPHIRE',
      caratWeight: 1.2,
      style: 'THREE_STONE',
      rating: 4.9,
      reviewCount: 67,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
            position: 0,
          },
          {
            url: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800',
            position: 1,
          },
        ],
      },
    },
  })

  console.log('Dev catalog seeded: 3 rings with 2 images each')
}
