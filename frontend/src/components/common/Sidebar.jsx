import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <aside id="aside" className="col-md-3">
      {/* Search */}
      <div className="widget">
        <div className="widget-search">
          <input className="search-input" type="text" placeholder="search" />
          <button className="search-btn" type="button">
            <i className="fa fa-search"></i>
          </button>
        </div>
      </div>

      {/* Category */}
      <div className="widget">
        <h3 className="title">Incubatee Topics - 2019</h3>
        <div className="widget-category">
          <a href="#water" onClick={(e) => e.preventDefault()}>Water Quality<span>(3)</span></a>
          <a href="#iot" onClick={(e) => e.preventDefault()}>IoT Cloud<span>(5)</span></a>
          <a href="#ml" onClick={(e) => e.preventDefault()}>Machine Learning<span>(3)</span></a>
          <a href="#air" onClick={(e) => e.preventDefault()}>Air Quality<span>(2)</span></a>
          <a href="#hpc" onClick={(e) => e.preventDefault()}>HPC for Analytics<span>(3)</span></a>
        </div>
      </div>

      {/* Event Calendar */}
      <div className="widget">
        <h3 className="title">Event Calendar</h3>
        <div className="widget-category">
          <iframe 
            src="https://calendar.google.com/calendar/b/2/embed?height=600&amp;wkst=1&amp;bgcolor=%23FFFFFF&amp;src=incubate%40iiitkottayam.ac.in&amp;color=%231B887A&amp;ctz=ASIA%2FCalcutta"
            style={{ border: 0, width: '100%', height: '250px' }}
            title="Event Calendar"
          ></iframe>
        </div>
      </div>

      {/* Posts sidebar */}
      <div className="widget">
        <h3 className="title">Product Development</h3>

        <div className="widget-post">
          <a href="#post1" onClick={(e) => e.preventDefault()}>
            <img src="/img/post1.jpg" alt="" /> IoT Cloud for Water Quality Analysis
          </a>
          <ul className="blog-meta">
            <li>Expected: Oct. 2019</li>
          </ul>
        </div>

        <div className="widget-post">
          <a href="#post2" onClick={(e) => e.preventDefault()}>
            <img src="/img/post2.jpg" alt="" /> IoT Cloud using Blockchain
          </a>
          <ul className="blog-meta">
            <li>Estimated: Dec. 2019</li>
          </ul>
        </div>

        <div className="widget-post">
          <a href="#post3" onClick={(e) => e.preventDefault()}>
            <img src="/img/post3.jpg" alt="" /> IoT Cloud for HPC Analytics
          </a>
          <ul className="blog-meta">
            <li>Expected: Aug. 2019</li>
          </ul>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
