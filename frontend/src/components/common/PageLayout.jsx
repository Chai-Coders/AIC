import React from 'react';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { useText } from '../../content/useText';
import Header from './Header';
import Footer from './Footer';
import PageHero from './PageHero';

/**
 * Standard inner-page shell: header, title band, content, footer.
 * `hero` takes the PageHero props; `title` (for the browser tab) defaults to the hero title.
 */
const PageLayout = ({ hero, title, children }) => {
  const t = useText();
  useDocumentTitle(title ?? (hero ? t(`${hero.prefix}.title`) : undefined));

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
