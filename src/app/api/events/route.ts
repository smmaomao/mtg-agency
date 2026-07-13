import { withTiming } from '../../../lib/timing'
import { handleCallback } from '@/lib/callbackHandler'

export const GET = withTiming(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const eventType = searchParams.get('event_type') || searchParams.get('type') || ''
  return handleCallback(request, eventType)
})
