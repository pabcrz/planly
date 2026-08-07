import { z } from 'zod'

// Postgres uuid type accepts any 32 hex character string separated by hyphens (8-4-4-4-12),
// whereas Zod's default .uuid() enforces strict RFC 4122 version/variant bits.
// Using this schema ensures compatibility with local seed data and test mocks while maintaining valid Postgres formats.
export const pgUuid = (message = 'UUID inválido') =>
  z.string().regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    message
  )
