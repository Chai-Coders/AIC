import React from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';
import { Text } from '../content/Text';

const NotFoundPage = () => (
  <PageLayout
    title="Page not found"
    hero={{
      prefix: 'notFound.hero',
      breadcrumbs: [{ label: 'Not found' }],
      actions: (
        <>
          <Link className="btn btn--accent" to="/">
            <Text k="notFound.hero.home" />
          </Link>
          <Link className="btn btn--outline" to="/#contact">
            <Text k="notFound.hero.contact" />
          </Link>
        </>
      ),
    }}
  />
);

export default NotFoundPage;
