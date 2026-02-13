import { call } from '@orpc/server'
import { describe, expect, it } from 'vitest'
import { router } from '../src/router.js'

async function createTestUser(name = 'Alice', email = 'alice@ring.local') {
  return call(router.user.create, { name, email })
}

describe('user.create', () => {
  it('creates a valid user', async () => {
    const user = await createTestUser()

    expect(user).toMatchObject({
      name: 'Alice',
      email: 'alice@ring.local',
    })
    expect(user.id).toBeDefined()
    expect(user.createdAt).toBeInstanceOf(Date)
    expect(user.updatedAt).toBeInstanceOf(Date)
  })

  it('fails on duplicate email', async () => {
    await createTestUser('Alice', 'alice@ring.local')

    await expect(createTestUser('Bob', 'alice@ring.local')).rejects.toThrow()
  })

  it('fails on duplicate name', async () => {
    await createTestUser('Alice', 'alice@ring.local')

    await expect(createTestUser('Alice', 'other@ring.local')).rejects.toThrow()
  })
})

describe('user.get', () => {
  it('returns existing user', async () => {
    const created = await createTestUser()
    const fetched = await call(router.user.get, { id: created.id })

    expect(fetched.id).toBe(created.id)
    expect(fetched.name).toBe('Alice')
  })

  it('throws on non-existent UUID', async () => {
    await expect(
      call(router.user.get, { id: '00000000-0000-0000-0000-000000000000' }),
    ).rejects.toThrow()
  })
})

describe('user.list', () => {
  it('returns users ordered by createdAt desc', async () => {
    const a = await createTestUser('Alice', 'alice@ring.local')
    const b = await createTestUser('Bob', 'bob@ring.local')

    const users = await call(router.user.list, { limit: 10, offset: 0 })

    expect(users).toHaveLength(2)
    // Most recent first
    expect(users[0]?.id).toBe(b.id)
    expect(users[1]?.id).toBe(a.id)
  })

  it('respects limit and offset', async () => {
    await createTestUser('Alice', 'alice@ring.local')
    await createTestUser('Bob', 'bob@ring.local')
    await createTestUser('Charlie', 'charlie@ring.local')

    const all = await call(router.user.list, { limit: 10, offset: 0 })
    const page = await call(router.user.list, { limit: 1, offset: 1 })

    expect(page).toHaveLength(1)
    // offset=1 skips the first result, so we get the second one
    expect(page[0]?.id).toBe(all[1]?.id)
  })

  it('returns empty list when no users', async () => {
    const users = await call(router.user.list, { limit: 10, offset: 0 })
    expect(users).toEqual([])
  })
})

describe('user.update', () => {
  it('updates name', async () => {
    const user = await createTestUser()
    const updated = await call(router.user.update, {
      id: user.id,
      data: { name: 'Alicia' },
    })

    expect(updated.name).toBe('Alicia')
    expect(updated.email).toBe('alice@ring.local')
  })

  it('updates email', async () => {
    const user = await createTestUser()
    const updated = await call(router.user.update, {
      id: user.id,
      data: { email: 'new@ring.local' },
    })

    expect(updated.email).toBe('new@ring.local')
    expect(updated.name).toBe('Alice')
  })

  it('partial update keeps other fields', async () => {
    const user = await createTestUser()
    const updated = await call(router.user.update, {
      id: user.id,
      data: { name: 'Alicia' },
    })

    expect(updated.email).toBe(user.email)
  })

  it('throws on non-existent UUID', async () => {
    await expect(
      call(router.user.update, {
        id: '00000000-0000-0000-0000-000000000000',
        data: { name: 'Ghost' },
      }),
    ).rejects.toThrow()
  })
})

describe('user.delete', () => {
  it('deletes user', async () => {
    const user = await createTestUser()
    const result = await call(router.user.delete, { id: user.id })

    expect(result).toEqual({ success: true })
  })

  it('throws on non-existent UUID', async () => {
    await expect(
      call(router.user.delete, { id: '00000000-0000-0000-0000-000000000000' }),
    ).rejects.toThrow()
  })

  it('deleted user no longer in list', async () => {
    const user = await createTestUser()
    await call(router.user.delete, { id: user.id })

    const users = await call(router.user.list, { limit: 10, offset: 0 })
    expect(users).toEqual([])
  })
})
