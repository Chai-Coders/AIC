import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ContentGrid from '../components/ContentGrid';

export default function NewsPage() {
  const { multiSelect, setMultiSelect, showToast } = useOutletContext();

  return (
    <ContentGrid
      routeId="news"
      routeName="News Updates"
      endpointUrl="/api/news/"
      multiSelect={multiSelect}
      setMultiSelect={setMultiSelect}
      showToast={showToast}
    />
  );
}
