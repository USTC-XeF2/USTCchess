export type ItemType = 'map' | 'extension'

export interface ResourceItem {
  type: ItemType
  id: number
  name: string
  authors: string[]
  latest_version: string
}

export interface ResourceVersion {
  id: number
  version: string
  created_at: number
}
