import { describe, expect, it } from 'vitest'
import {
  CreateUserSchema,
  LoginSchema,
  UpdateUserSchema,
  UserSchema,
} from '../src/schemas/index.js'

describe('UserSchema', () => {
  const validUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'alice@ring.local',
    name: 'Alice',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('accepts a valid user', () => {
    const result = UserSchema.safeParse(validUser)
    expect(result.success).toBe(true)
  })

  it('rejects missing fields', () => {
    const result = UserSchema.safeParse({ id: validUser.id })
    expect(result.success).toBe(false)
  })

  it('rejects invalid uuid', () => {
    const result = UserSchema.safeParse({ ...validUser, id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = UserSchema.safeParse({ ...validUser, email: 'not-email' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = UserSchema.safeParse({ ...validUser, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 100 chars', () => {
    const result = UserSchema.safeParse({ ...validUser, name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects non-date timestamps', () => {
    const result = UserSchema.safeParse({ ...validUser, createdAt: 'not-a-date' })
    expect(result.success).toBe(false)
  })
})

describe('CreateUserSchema', () => {
  it('accepts valid { email, name }', () => {
    const result = CreateUserSchema.safeParse({ email: 'bob@ring.local', name: 'Bob' })
    expect(result.success).toBe(true)
  })

  it('rejects missing email', () => {
    const result = CreateUserSchema.safeParse({ name: 'Bob' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = CreateUserSchema.safeParse({ email: 'bob@ring.local' })
    expect(result.success).toBe(false)
  })

  it('strips extra fields like id', () => {
    const result = CreateUserSchema.safeParse({
      email: 'bob@ring.local',
      name: 'Bob',
      id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('id')
    }
  })
})

describe('UpdateUserSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = UpdateUserSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts { name } only', () => {
    const result = UpdateUserSchema.safeParse({ name: 'NewName' })
    expect(result.success).toBe(true)
  })

  it('accepts { email } only', () => {
    const result = UpdateUserSchema.safeParse({ email: 'new@ring.local' })
    expect(result.success).toBe(true)
  })

  it('accepts { name, email }', () => {
    const result = UpdateUserSchema.safeParse({ name: 'NewName', email: 'new@ring.local' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = UpdateUserSchema.safeParse({ email: 'bad-email' })
    expect(result.success).toBe(false)
  })
})

describe('LoginSchema', () => {
  it('accepts valid { name }', () => {
    const result = LoginSchema.safeParse({ name: 'Alice' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = LoginSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 100 chars', () => {
    const result = LoginSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = LoginSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
