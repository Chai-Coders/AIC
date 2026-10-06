import { useEffect } from 'react';

const SITE_NAME = 'AIC-IIITK';

/** Sets the browser tab title for the current page. */
function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Atal Incubation Centre, IIIT Kottayam`;
  }, [title]);
}

export default useDocumentTitle;
