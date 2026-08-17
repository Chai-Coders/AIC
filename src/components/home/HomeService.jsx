import React from 'react';

const HomeService = () => {
  const services = [
    {
      icon: 'fa-wrench',
      title: 'Training Support',
      description: 'We offer training in order to gain knowledge (both practical and theoretical) for incubatee developments.'
    },
    {
      icon: 'fa-trophy',
      title: 'Patent support',
      description: 'IP support will be provided at our centre with leading mentors of AIC-IIITKottayam.'
    },
    {
      icon: 'fa-cogs',
      title: 'Idea Generation Support',
      description: 'Knowledge hub for developing products will be offered to the incubatee via. brainstorms or hackathons.'
    },
    {
      icon: 'fa-snowflake-o',
      title: 'Marketing',
      description: 'Sales and marketing department of AIC-IIITKottayam will ensure that the product will be utilized in the society.'
    },
    {
      icon: 'fa-mortar-board',
      title: 'Reputation',
      description: 'Reputation for both mentors and incubates will be ensured at AIC-IIITKottayam.'
    },
    {
      icon: 'fa-flask',
      title: 'Global Visibility',
      description: 'International and National collaborators or industrialists will be invited for wide visibility.'
    }
  ];

  return (
    <div id="service" className="section md-padding">
      <div className="container">
        <div className="row">
          <div className="section-header text-center">
            <h2 className="title">AIC-IIITKottayam - Value Proposition</h2>
          </div>

          {services.map((item, index) => (
            <div key={index} className="col-md-4 col-sm-6">
              <div className="service">
                <i className={`fa ${item.icon}`}></i>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeService;
