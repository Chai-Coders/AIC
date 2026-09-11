import React from 'react';
import { Link } from 'react-router-dom';

const HeaderBanner = ({ title, breadcrumbs = [] }) => {
  return (
    <div className="header-wrapper sm-padding bg-grey">
      <div className="container header-banner-container">
        <h2 className="header-banner-title">{title}</h2>
        <ul className="breadcrumb header-breadcrumb">
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
