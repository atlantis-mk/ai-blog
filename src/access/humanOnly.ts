import type { Access, FieldAccess } from 'payload'

type UserWithCollection = {
  collection?: string
} | null

export const isHumanUser = (user: UserWithCollection): boolean => user?.collection === 'users'

export const humanOnly: Access = ({ req }) => isHumanUser(req.user)

export const humanFieldAccess: FieldAccess = ({ req }) => isHumanUser(req.user)
