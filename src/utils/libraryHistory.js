const LIBRARY_PATH_KEY = 'frost-library-path'
const LIBRARY_TAB_KEY  = 'frost-library-tab'

export function getLastLibraryPath() {
  return sessionStorage.getItem(LIBRARY_PATH_KEY) ?? '/library'
}

export function setLastLibraryPath(path) {
  sessionStorage.setItem(LIBRARY_PATH_KEY, path)
}

export function getLastLibraryTab() {
  return sessionStorage.getItem(LIBRARY_TAB_KEY) ?? 'favorites'
}

export function setLastLibraryTab(tab) {
  sessionStorage.setItem(LIBRARY_TAB_KEY, tab)
}
