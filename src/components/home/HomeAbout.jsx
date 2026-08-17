import React from 'react';
import { Link } from 'react-router-dom';

const HomeAbout = () => {
  return (
    <div id="about" className="section md-padding">
      <div className="container">
        <div className="row">
          <div className="section-header text-center">
            <h2 className="title">AIC-IIITKottayam Incubation Centre</h2>
          </div>

          <div className="col-md-4">
            <div className="about">
              <i className="fa fa-sticky-note-o"></i>
              <h3>Summary</h3>
              <p>AIC-IIITKottayam is the incubation centre of Indian Institute of Information Technology Kottayam under AIM scheme of India.</p>
              <Link to="/summary.html">Read more</Link>
            </div>
          </div>

          <div className="col-md-4">
            <div className="about">
              <i className="fa fa-group"></i>
              <h3>Team Members</h3>
              <p>AIC-IIITKottayam centre is governed by leading industrialists and academicians of the globe ...</p>
              <Link to="/aicteam.html">Read more</Link>
            </div>
          </div>

          <div className="col-md-4">
            <div className="about">
              <i className="fa fa-diamond"></i>
              <h3>Sustainability</h3>
              <p>AIC-IIITKottayam aims at sustainability while creating an ecosystem of entrepreneurs in IoT cloud domain...</p>
              <Link to="/summary.html">Read more</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeAbout;
