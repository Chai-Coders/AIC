import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ContentGrid from '../components/ContentGrid';

export default function TeamPage() {
  const { multiSelect, setMultiSelect, showToast } = useOutletContext();

  return (
    <ContentGrid
      routeId="team"
      routeName="Team Members"
      endpointUrl="/api/team/"
      multiSelect={multiSelect}
      setMultiSelect={setMultiSelect}
      showToast={showToast}
    />
  );
}
