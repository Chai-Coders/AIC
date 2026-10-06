import React from 'react';
import { NavLink } from 'react-router-dom';

const PEOPLE_LINKS = [
  { to: '/boardmember', label: 'Board of Governors' },
  { to: '/aicteam', label: 'AIC Team' },
  { to: '/mentor', label: 'Mentors' },
];

/** Tab-style links between the three people pages. */
const PeopleNav = () => (
  <nav className="tabs" aria-label="People">
    {PEOPLE_LINKS.map((link) => (
      <NavLink key={link.to} to={link.to} className={({ isActive }) => `tabs__link ${isActive ? 'is-active' : ''}`}>
        {link.label}
      </NavLink>
    ))}
  </nav>
);

export default PeopleNav;
