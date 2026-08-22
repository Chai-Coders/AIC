import React from 'react';
import MemberCarousel from './MemberCarousel';

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
  return <MemberCarousel members={members} title="AIC-IIITKottayam Board of Governors" variant="board" />;
};

export default BoardGrid;
