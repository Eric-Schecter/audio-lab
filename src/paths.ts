// Public assets and hash routes share Vite's deployment prefix.
export const publicAsset = (url?: string) => url?.startsWith('/audio/')
  ? import.meta.env.BASE_URL + url.slice(1)
  : url;
export const routeHref = (route: string) => import.meta.env.BASE_URL + '#' + route;
export const readRoute = () => location.hash.startsWith('#/')
  ? location.hash.slice(1)
  : '/' + location.pathname.slice(import.meta.env.BASE_URL.length).replace(/^\//, '') + location.search;
