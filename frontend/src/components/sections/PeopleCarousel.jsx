import React from 'react';
import AsyncState, { EmptyState, SkeletonGrid } from '../common/AsyncState';
import MemberCarousel from './MemberCarousel';
import useApi from '../../hooks/useApi';
import { fetchTeam } from '../../api/content';
import { cdnImage } from '../../lib/image';
import { useText } from '../../content/useText';
import { Text } from '../../content/Text';

/**
 * People from the /team/ API for one category, shown with the carousel design.
 * The heading and the text shown when nobody is listed are `<prefix>.title` and `<prefix>.empty`.
 * @param {{ category: 'team'|'governor'|'mentor_intl_industry'|'mentor_intl_academic'|'mentor_india_industry'|'mentor_india_academic', prefix: string, variant?: string }} props
 */
const PeopleCarousel = ({ category, prefix, variant = '' }) => {
  const t = useText();
  const members = useApi(fetchTeam(category));

  return (
    <AsyncState
      state={members}
      skeleton={<SkeletonGrid count={4} className="grid grid--4" />}
      empty={<EmptyState icon="fa-users" title={<Text k={`${prefix}.empty`} />} />}
    >
      {(list) => (
        <MemberCarousel
          members={list.map((m) => ({ ...m, img: m.photo ? cdnImage(m.photo, 600) : null }))}
          title={t(`${prefix}.title`)}
          heading={<Text k={`${prefix}.title`} />}
          variant={variant}
        />
      )}
    </AsyncState>
  );
};

export default PeopleCarousel;
