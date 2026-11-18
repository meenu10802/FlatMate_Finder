import { useEffect } from 'react';

const APP = 'Flatmate Finder';

/** Sets document.title ("Inbox · Flatmate Finder"). Screen readers announce it on navigation. */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP}` : `${APP} — find a flatmate who fits your life`;
  }, [title]);
}
