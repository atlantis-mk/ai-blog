import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'
import { isHumanUser } from './humanOnly'

type isAuthenticated = (args: AccessArgs<User>) => boolean

export const authenticated: isAuthenticated = ({ req: { user } }) => {
  return isHumanUser(user)
}
