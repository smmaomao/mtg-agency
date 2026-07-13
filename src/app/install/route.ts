import { withTiming } from '../../lib/timing'
import { handleCallback } from '@/lib/callbackHandler'

export const GET = withTiming(async (request: Request) => {
  return handleCallback(request, 'install')
})
