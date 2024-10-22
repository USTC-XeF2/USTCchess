import type { Extension, ExtensionInfo } from '../types/extension'
import { isVersion } from './map'

export function isExtension(obj): obj is Extension {
  return (
    typeof obj.key === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.author === 'string' &&
    isVersion(obj.version) &&
    typeof obj.init === 'function'
  )
}

export const getInfo = (extension: Extension): ExtensionInfo => {
  const { key, name, author, version } = extension
  return { key, name, author, version }
}
