import React from 'react';
import { Link } from 'react-router-dom';

const HeaderBanner = ({ title, breadcrumbs = [] }) => {
  return (
    <div className="header-wrapper sm-padding bg-grey">
      <div className="container">
        <h2>{title}</h2>
        <ul className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/">Home</Link>
          </li>
          {breadcrumbs.map((crumb, index) => (
            <li key={index} className="breadcrumb-item active">
              {crumb.link ? <Link to={crumb.link}>{crumb.label}</Link> : crumb.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default HeaderBanner;
