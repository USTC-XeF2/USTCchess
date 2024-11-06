import semver from 'semver'

import type { Extension, ExtensionInfo } from '../types/extension'

export function isExtension(obj): obj is Extension {
  if (typeof obj.key !== 'string') return false
  if (typeof obj.name !== 'string') return false
  if (typeof obj.author !== 'string') return false
  if (!semver.valid(obj.version)) return false
  if (obj.init && typeof obj.init !== 'function') return false
  if (obj.onMove && typeof obj.onMove !== 'function') return false
  if (obj.onDeath && typeof obj.onDeath !== 'function') return false
  return true
}

export function getInfo(extension: Extension): ExtensionInfo {
  const { key, name, author, version } = extension
  return { key, name, author, version }
}
