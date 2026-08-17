import React from 'react';

const members = [
  { name: 'Prof. Prasad Krishna', role: 'Director-IIIT Kottayam', designation: 'Chairman' },
  { name: 'Dr. M. Radhakrishnan', role: 'Registrar-IIITKottayam', designation: 'Director-AIC, Member' },
  { name: 'R. Ramanan', role: 'First-Mission Director (AIM)', designation: 'Member' },
  { name: 'Dr. Shajulin Benedict', role: 'PI - AIC & Faculty, IIITKottayam', designation: 'Director-AIC, Member', link: 'http://www.sbenedictglobal.com' },
  { name: 'Dr. Ebin Deni Raj', role: 'Associate Dean-IIITKottayam', designation: 'Member' },
  { name: 'Ms. Preethi M', role: 'TBI-NIT-Calicut', designation: 'Member' },
  { name: 'Mr. Anil Sharma', role: 'Global Data Plc, Hyderabad', designation: 'Member' },
  { name: 'Mr. Amirtharaj C.', role: 'IBM Singapore', designation: 'Member' },
  { name: 'Shri. T. Velayutham', role: 'BEL-Bangalore', designation: 'Member' }
];

const BoardGrid = () => {
  return (
    <div id="about" className="section md-padding">
      <div className="container">
        <div className="row">
          <div className="section-header text-center">
            <h2 className="title">AIC-IIITKottayam Board of Governors</h2>
          </div>

          {members.map((member, idx) => (
            <div key={idx} className="col-md-4">
              <div className="about">
                {member.link ? (
                  <a href={member.link} target="_blank" rel="noopener noreferrer">
                    <h3>{member.name}</h3>
                    <p>{member.role}<br />{member.designation}</p>
                  </a>
                ) : (
                  <>
                    <h3>{member.name}</h3>
                    <p>{member.role}<br />{member.designation}</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BoardGrid;
