import React from 'react';
import MemberCarousel from './MemberCarousel';
import useApi from '../../hooks/useApi';
import { fetchTeam } from '../../api/content';

const BoardGrid = () => {
  const { data: members, loading, error } = useApi(() => fetchTeam('governor'));

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
        <i className="fa fa-spinner fa-spin fa-2x" />
        <p style={{ marginTop: '16px' }}>Loading board members…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#c0392b' }}>
        <i className="fa fa-exclamation-circle fa-2x" />
        <p style={{ marginTop: '12px' }}>
          Could not load board members. Please try again later.
        </p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
        <p>No board members listed yet.</p>
      </div>
    );
  }

  // Map API fields → shape expected by MemberCarousel/MemberCard
  const mapped = members.map((m) => ({
    ...m,
    img: m.photo || null,
  }));

  return (
    <MemberCarousel
      members={mapped}
      title="AIC-IIITKottayam Board of Governors"
      variant="board"
    />
  );
};

export default BoardGrid;
