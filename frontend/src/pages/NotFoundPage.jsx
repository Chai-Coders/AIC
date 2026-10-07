import React from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/common/PageLayout';

const NotFoundPage = () => (
  <PageLayout
    title="Page not found"
    hero={{
      eyebrow: 'Error 404',
      title: 'We couldn’t find that page',
      description: 'The page may have moved, or the link may be out of date.',
      breadcrumbs: [{ label: 'Not found' }],
      actions: (
        <>
          <Link className="btn btn--accent" to="/">
            Go to home page
          </Link>
          <Link className="btn btn--outline" to="/#contact">
            Contact us
          </Link>
        </>
      ),
    }}
  />
);

export default NotFoundPage;
