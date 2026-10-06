import React, { useState } from 'react';
import AsyncState, { EmptyState, SkeletonGrid } from '../common/AsyncState';
import Modal from '../common/Modal';
import useApi from '../../hooks/useApi';
import { fetchTeam } from '../../api/content';
import { cdnImage } from '../../lib/image';

const initialsFor = (name = '') =>
  name
    .replace(/^(Prof\. Dr\.|Prof\.|Dr\.|Mrs\.|Ms\.|Mr\.|Shri\.?)\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const Portrait = ({ member, width }) =>
  member.photo ? (
    <img src={cdnImage(member.photo, width)} alt="" loading="lazy" decoding="async" />
  ) : (
    <span className="member-card__initials" aria-hidden="true">
      {initialsFor(member.name)}
    </span>
  );

const MemberCard = ({ member, onOpen }) => {
  const hasBio = Boolean(member.bio?.trim());
  return (
    <article className="member-card">
      <div className="member-card__photo">
        <Portrait member={member} width={480} />
      </div>
      <div className="member-card__body">
        <h3 className="member-card__name">{member.name}</h3>
        {member.role && <p className="member-card__role">{member.role}</p>}
        {hasBio && (
          <button type="button" className="text-link member-card__more stretched-link" onClick={() => onOpen(member)}>
            View profile <i className="fa fa-arrow-right" aria-hidden="true" />
            <span className="sr-only"> of {member.name}</span>
          </button>
        )}
      </div>
    </article>
  );
};

/**
 * Grid of people from the /team/ API for one category, with a profile dialog for bios.
 * @param {{ category: 'team'|'mentor'|'governor', emptyText?: string }} props
 */
const MemberGrid = ({ category, emptyText = 'No members listed yet.' }) => {
  const members = useApi(fetchTeam(category));
  const [selected, setSelected] = useState(null);

  return (
    <>
      <AsyncState
        state={members}
        skeleton={<SkeletonGrid count={8} className="member-grid" />}
        empty={<EmptyState icon="fa-users" title={emptyText} />}
      >
        {(list) => (
          <div className="member-grid">
            {list.map((m) => (
              <MemberCard key={m.id} member={m} onOpen={setSelected} />
            ))}
          </div>
        )}
      </AsyncState>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} label={selected?.name} className="member-dialog">
        {selected && (
          <div className="member-dialog__inner">
            <div className="member-dialog__photo">
              <Portrait member={selected} width={600} />
            </div>
            <div className="member-dialog__body">
              <h2>{selected.name}</h2>
              {selected.role && <p className="member-card__role">{selected.role}</p>}
              {selected.category_display && <span className="chip chip--primary">{selected.category_display}</span>}
              <p className="member-dialog__bio">{selected.bio}</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default MemberGrid;
