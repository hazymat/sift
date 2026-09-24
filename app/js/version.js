// Which version of Sift this is. The deploy (.github/workflows/pages.yml)
// stamps the commit and the day it was built; running from a laptop it says "dev".
export const VERSION = 'dev';
export const BUILT = '';
export const versionText = () => (VERSION === 'dev' ? 'dev' : `${BUILT} · ${VERSION}`);
