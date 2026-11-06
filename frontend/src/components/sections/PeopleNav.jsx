import React from 'react';
import { NavLink } from 'react-router-dom';
import { Text } from '../../content/Text';

const PEOPLE_LINKS = [
  { to: '/boardmember', label: 'people.tabs.board' },
  { to: '/aicteam', label: 'people.tabs.team' },
  { to: '/mentor', label: 'people.tabs.mentors' },
];

/** Tab-style links between the three people pages. */
const PeopleNav = () => (
  <nav className="tabs" aria-label="People">
    {PEOPLE_LINKS.map((link) => (
      <NavLink key={link.to} to={link.to} className={({ isActive }) => `tabs__link ${isActive ? 'is-active' : ''}`}>
        <Text k={link.label} />
      </NavLink>
    ))}
  </nav>
);

export default PeopleNav;
