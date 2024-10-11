import api from './index.ts'

declare global {
  interface Window {
    electronAPI: api
  }
}
