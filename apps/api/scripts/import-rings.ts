/**
 * Import crawled ring data from the crawler output into the database.
 *
 * Usage:
 *   cd apps/api
 *   bun run scripts/import-rings.ts [path-to-json]
 *
 * Defaults to ../crawler/output/data/all_combined.json if no path given.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { db } from '../src/db.js'

// ── Types ────────────────────────────────────────────────────────────────────

interface CrawledImage {
  url: string
  local_path: string | null
  cdn_url: string | null
  position: number
}

interface CrawledRing {
  name: string
  description: string | null
  metal_type: string
  stone_type: string
  carat_weight: number
  style: string
  rating: number
  review_count: number
  images: CrawledImage[]
  price_eur: number | null
  brand: string
  collection: string | null
  source_url: string
  tier: string
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const defaultPath = resolve(import.meta.dirname!, '../../crawler/output/data/all_combined.json')
  const inputPath = process.argv[2] || defaultPath
  console.log(`\nImporting from: ${inputPath}\n`)

  const raw = readFileSync(inputPath, 'utf-8')
  const rings: CrawledRing[] = JSON.parse(raw)

  console.log(`Found ${rings.length} rings to import\n`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const ring of rings) {
    try {
      // Skip rings without images (need at least 1 for the app)
      if (!ring.images.length) {
        console.log(`  skip (no images): ${ring.name}`)
        skipped++
        continue
      }

      // Use CDN URL if available, otherwise original URL
      const imageUrls = ring.images.map((img) => img.cdn_url || img.url).filter(Boolean)

      if (!imageUrls.length) {
        console.log(`  skip (no valid image URLs): ${ring.name}`)
        skipped++
        continue
      }

      // Check for duplicate by name
      const existing = await db.ring.findFirst({
        where: { name: ring.name },
      })

      if (existing) {
        console.log(`  skip (duplicate): ${ring.name}`)
        skipped++
        continue
      }

      // Create ring with images
      const created = await db.ring.create({
        data: {
          name: ring.name,
          description: ring.description,
          metalType: ring.metal_type as any,
          stoneType: ring.stone_type as any,
          caratWeight: ring.carat_weight || 0.5,
          style: ring.style as any,
          rating: ring.rating || 0,
          reviewCount: ring.review_count || 0,
          images: {
            create: imageUrls.map((url, i) => ({
              url,
              position: i,
            })),
          },
        },
      })

      console.log(`  imported: ${created.name} (${imageUrls.length} images)`)
      imported++
    } catch (e) {
      console.error(`  error: ${ring.name} — ${e}`)
      errors++
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Imported: ${imported}`)
  console.log(`Skipped:  ${skipped}`)
  console.log(`Errors:   ${errors}`)
  console.log(`Total:    ${rings.length}`)

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
