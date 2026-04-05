import type { IncomingHttpHeaders } from 'node:http'

export function toHeaders(headers: IncomingHttpHeaders) {
  const requestHeaders = new Headers()

  Object.entries(headers).forEach(([key, value]) => {
    if (value === undefined) return

    if (Array.isArray(value)) {
      value.forEach((item) => requestHeaders.append(key, item))
      return
    }

    requestHeaders.set(key, value)
  })

  return requestHeaders
}
