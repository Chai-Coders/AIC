import React from 'react';
import MemberCarousel from './MemberCarousel';

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
  return <MemberCarousel members={teamMembers} title="AIC-IIITKottayam Team" />;
};

export default TeamGrid;
