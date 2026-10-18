import React from 'react';
import AsyncState, { EmptyState, SkeletonGrid } from '../common/AsyncState';
import MemberCarousel from './MemberCarousel';
import useApi from '../../hooks/useApi';
import { fetchTeam } from '../../api/content';
import { cdnImage } from '../../lib/image';

/**
 * People from the /team/ API for one category, shown with the carousel design.
 * @param {{ category: 'team'|'mentor'|'governor', title: string, variant?: string, emptyText?: string }} props
 */
const PeopleCarousel = ({ category, title, variant = '', emptyText = 'No members listed yet.' }) => {
  const members = useApi(fetchTeam(category));

  return (
    <AsyncState
      state={members}
      skeleton={<SkeletonGrid count={4} className="grid grid--4" />}
      empty={<EmptyState icon="fa-users" title={emptyText} />}
    >
      {(list) => (
        <MemberCarousel
          members={list.map((m) => ({ ...m, img: m.photo ? cdnImage(m.photo, 600) : null }))}
          title={title}
          variant={variant}
        />
      )}
    </AsyncState>
  );
};

export default PeopleCarousel;
