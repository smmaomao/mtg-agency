// In-memory GET response cache for /api/ requests only.
// Used to avoid re-requesting data when switching back to already-open
// pages (tabs), and cleared on manual refresh.
//
// IMPORTANT: only /api/ URLs are intercepted. All other GET requests
// (Next.js RSC navigation, chunk loading, etc.) are passed through to
// the original fetch unchanged. Previously, intercepting all GETs broke
// Next.js client-side navigation because the RSC payload is not JSON and
// clone.json() would throw, forcing a full page reload.

interface Inflight {
  promise: Promise<unknown>
  controller: AbortController
}

const cache = new Map<string, unknown>()
const inflight = new Map<string, Inflight>()

export function getCached(url: string): unknown | undefined {
  return cache.get(url)
}

export function setCached(url: string, data: unknown): void {
  cache.set(url, data)
}

// Clear both the response cache and abort any in-flight requests.
export function clearApiCache(): void {
  cache.clear()
  inflight.forEach(({ controller }) => controller.abort())
  inflight.clear()
}

function isApiUrl(url: string): boolean {
  // Only intercept requests whose path starts with /api/ — these are our
  // data endpoints that return JSON. Everything else (RSC payloads, chunk
  // requests, etc.) must go through the original fetch untouched.
  try {
    const path = new URL(url, 'http://localhost').pathname
    return path.startsWith('/api/')
  } catch {
    // If URL parsing fails, it's likely not an API route.
    return url.startsWith('/api/')
  }
}

// Patch window.fetch so that /api/ GET responses are cached by full URL.
// Any mutation (POST/PUT/DELETE) invalidates the whole cache so that
// subsequent reads reflect the changes. Non-/api/ requests are never
// intercepted — they go straight to the original fetch.
export function patchFetch(): void {
  if (typeof window === 'undefined') return
  if ((window as unknown as { __fetchPatched?: boolean }).__fetchPatched) return
  ;(window as unknown as { __fetchPatched?: boolean }).__fetchPatched = true

  const original = window.fetch.bind(window)

  function jsonResponse(data: unknown): Response {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : (input as Request).url || ''
    const method = (init?.method || 'GET').toUpperCase()

    // Only intercept /api/ requests. All other requests (RSC navigation,
    // chunk loading, static assets, etc.) pass through untouched.
    if (!isApiUrl(url)) {
      return original(input, init)
    }

    if (method === 'GET') {
      // 1. Serve straight from the response cache.
      if (cache.has(url)) {
        return jsonResponse(cache.get(url))
      }

      // 2. Reuse an in-flight request if one is already running for this URL.
      const existing = inflight.get(url)
      if (existing) {
        try {
          const data = await existing.promise
          return jsonResponse(data)
        } catch {
          // The in-flight request failed; drop it and start a fresh one below.
          inflight.delete(url)
        }
      }

      // 3. Start a new request, tracked so concurrent callers can de-duplicate.
      // Strip the caller's abort signal: a single caller aborting must not
      // cancel a request that other (reusing) callers are still waiting on.
      const { signal: _signal, ...restInit } = init || {}
      const controller = new AbortController()
      const promise = (async () => {
        const res = await original(input, restInit)
        const clone = res.clone()
        const data = await clone.json()
        cache.set(url, data)
        return data
      })()
      inflight.set(url, { promise, controller })
      promise.finally(() => inflight.delete(url))

      const data = await promise
      return jsonResponse(data)
    }

    // Mutations invalidate everything.
    cache.clear()
    inflight.forEach(({ controller }) => controller.abort())
    inflight.clear()
    return original(input, init)
  }
}

// Patch at module load time (browser only). React runs child-component
// effects BEFORE parent-component effects, so patching inside a parent's
// useEffect would be too late for child pages (e.g. a child page's first
// fetch would hit the un-patched native fetch). Running it here guarantees
// window.fetch is patched before any component effect executes.
if (typeof window !== 'undefined') {
  patchFetch()
}
