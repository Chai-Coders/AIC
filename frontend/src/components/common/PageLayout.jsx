import React from 'react';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import Header from './Header';
import Footer from './Footer';
import PageHero from './PageHero';

/**
 * Standard inner-page shell: header, title band, content, footer.
 * `hero` takes the PageHero props; `title` (for the browser tab) defaults to hero.title.
 */
const PageLayout = ({ hero, title, children }) => {
  useDocumentTitle(title ?? (typeof hero?.title === 'string' ? hero.title : undefined));

  return (
    <>
      <Header />
      <main id="main-content">
        {hero && <PageHero {...hero} />}
        {children}
      </main>
      <Footer />
    </>
  );
};

export default PageLayout;
