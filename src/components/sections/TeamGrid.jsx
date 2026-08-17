import React from 'react';

const teamMembers = [
  {
    name: 'Dr. Shajulin Benedict',
    role: 'Director/PI/Representative Officer',
    email: 'shajulin@iiitkottayam.ac.in',
    phones: ['0091-482 2202155', '0091-9443543746'],
    img: '/img/team1.jpg',
    link: 'http://www.sbenedictglobal.com'
  },
  {
    name: 'Dr. Kiran Vijay',
    role: 'Chief Executive Officer',
    email: 'ceo-aic@iiitkottayam.ac.in',
    phones: ['0091-482 2202156', '0091-9809082432'],
    img: '/img/kiran.jpeg',
    link: 'http://icentre.iiitkottayam.ac.in'
  },
  {
    name: 'Mr. Aravind Saji',
    role: 'Business Associate - Marketing & Partnerships',
    email: 'ba1-aic@iiitkottayam.ac.in',
    phones: ['+91-4822202157', '+91-8281753119'],
    img: '/img/aravind.jpeg'
  },
  {
    name: 'Mrs. Aneetta Jose',
    role: 'Executive Assistant',
    email: 'pa1-aic@iiitkottayam.ac.in',
    phones: ['+91-4822202157', '+91-9061630417'],
    img: '/img/aneetta.jpeg'
  }
];

const TeamGrid = () => {
  return (
    <div id="about" className="section md-padding">
      <div className="container">
        <div className="row">
          <div className="section-header text-center">
            <h2 className="title">AIC-IIITKottayam Team</h2>
          </div>

          {teamMembers.map((member, idx) => (
            <div key={idx} className="col-md-4">
              <div className="about" style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '15px' }}>
                  {member.link ? (
                    <a href={member.link} target="_blank" rel="noopener noreferrer">
                      <img 
                        className="logo" 
                        src={member.img} 
                        alt={member.name}
                        style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }} 
                      />
                    </a>
                  ) : (
                    <img 
                      className="logo" 
                      src={member.img} 
                      alt={member.name}
                      style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                  )}
                </div>
                <h3>{member.name}</h3>
                <p>
                  {member.role}<br />
                  <a href={`mailto:${member.email}`}>{member.email}</a><br />
                  {member.phones.join(' / ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamGrid;
