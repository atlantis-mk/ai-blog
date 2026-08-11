import type { Access } from 'payload'

import { isHumanUser } from './humanOnly'

export const authenticatedOrPublished: Access = ({ req: { user } }) => {
  if (isHumanUser(user)) {
    return true
  }

  return {
    _status: {
      equals: 'published',
    },
  }
}
