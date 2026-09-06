import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ContentGrid from '../components/ContentGrid';

export default function GalleryPage() {
  const { multiSelect, setMultiSelect, showToast } = useOutletContext();

  return (
    <ContentGrid
      routeId="gallery"
      routeName="Gallery Items"
      endpointUrl="/api/gallery/"
      multiSelect={multiSelect}
      setMultiSelect={setMultiSelect}
      showToast={showToast}
    />
  );
}
