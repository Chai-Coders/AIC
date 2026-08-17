import React from 'react';

const stats = [
  { icon: 'fa-users', count: '42', title: 'Number of Startup' },
  { icon: 'fa-trophy', count: '141', title: 'Jobs Created' },
  { icon: 'fa-coffee', count: '12', title: 'Submissions' },
  { icon: 'fa-file', count: '11', title: 'IP generated' }
];

const HomeNumbers = () => {
  return (
    <div id="numbers" className="section sm-padding">
      <div className="bg-img" style={{ backgroundImage: "url('/img/background2.jpg')" }}>
        <div className="overlay"></div>
      </div>

      <div className="container">
        <div className="row">
          {stats.map((item, idx) => (
            <div key={idx} className="col-sm-3 col-xs-6">
              <div className="number">
                <i className={`fa ${item.icon}`}></i>
                <h3 className="white-text"><span className="counter">{item.count}</span></h3>
                <span className="white-text">{item.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeNumbers;
