import React from 'react';
import { Link } from 'react-router-dom';
import SpotlightCard from '../common/SpotlightCard';

const HomeAbout = () => {
  return (
    <div id="about" className="section md-padding">
      <div className="container">
        <div className="row flex-grid">
          <div className="section-header text-center col-xs-12">
            <h2 className="title">AIC-IIITKottayam Incubation Centre</h2>
          </div>

          <div className="col-md-4 flex-col">
            <SpotlightCard className="about" spotlightColor="rgba(241, 236, 52, 0.4)">
              <i className="fa fa-sticky-note-o"></i>
              <h3>Summary</h3>
              <p>AIC-IIITKottayam is the incubation centre of Indian Institute of Information Technology Kottayam under AIM scheme of India.</p>
              <Link to="/summary.html">Read more</Link>
            </SpotlightCard>
          </div>

          <div className="col-md-4 flex-col">
            <SpotlightCard className="about" spotlightColor="rgba(241, 236, 52, 0.4)">
              <i className="fa fa-group"></i>
              <h3>Team Members</h3>
              <p>AIC-IIITKottayam centre is governed by leading industrialists and academicians of the globe ...</p>
              <Link to="/aicteam.html">Read more</Link>
            </SpotlightCard>
          </div>

          <div className="col-md-4 flex-col">
            <SpotlightCard className="about" spotlightColor="rgba(241, 236, 52, 0.4)">
              <i className="fa fa-diamond"></i>
              <h3>Sustainability</h3>
              <p>AIC-IIITKottayam aims at sustainability while creating an ecosystem of entrepreneurs in IoT cloud domain...</p>
              <Link to="/summary.html">Read more</Link>
            </SpotlightCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeAbout;
