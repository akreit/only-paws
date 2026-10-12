interface NetworkInformationLike {
  saveData?: boolean
  effectiveType?: string
}

function currentConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection
}

/** Whether idle-time prefetching is acceptable: not on Save-Data or 2G-class connections. */
export function shouldPreloadOnIdle(connection = currentConnection()): boolean {
  if (connection?.saveData) return false
  return connection?.effectiveType !== '2g' && connection?.effectiveType !== 'slow-2g'
}
