import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ContentGrid from '../components/ContentGrid';

export default function StartupsPage() {
  const { multiSelect, setMultiSelect, showToast } = useOutletContext();

  return (
    <ContentGrid
      routeId="startups"
      routeName="Startups"
      endpointUrl="/api/startups/"
      multiSelect={multiSelect}
      setMultiSelect={setMultiSelect}
      showToast={showToast}
    />
  );
}
