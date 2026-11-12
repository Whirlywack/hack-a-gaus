// Phone or desktop. Kept apart from mode.tsx so the server layout can import it.

/** A window at least this wide gets the desktop layout: the ruled sheet with the top navigation. */
export const WIDE_QUERY = '(min-width: 700px)'

/** Runs in <head> before the first paint and marks the page's mode, so the
 * stylesheets key off the right `html[data-mode]` before React has run. */
export const MODE_SCRIPT = `document.documentElement.dataset.mode = matchMedia(${JSON.stringify(WIDE_QUERY)}).matches ? 'desktop' : 'native'`
