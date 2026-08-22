import React from 'react';
import MemberCarousel from './MemberCarousel';

const intlIndustry = [
  { name: 'Dr.Ventsislav Petkov', role: 'Data Analyst Engineer', org: 'Telefonica Germany GmBH Germany' },
  { name: 'Dr.Jorge Cardoso', role: 'Chief Architect for Cloud Operations and Analytics', org: 'Huawei Technologies Duesseldorf GmbH Germany' }
];

const intlAcademic = [
  { name: 'Prof. Dr. Michael Gerndt', role: 'TUM-Germany', designation: 'Mentor/Trainer' },
  { name: 'Prof. Dr. Thomas Fahringer', role: 'Univ.ofInnsbruck Austria', designation: 'Mentor' },
  { name: 'Prof. Dr.David Kaeli', role: 'Northeastern University, USA', designation: 'Mentor' }
];

const indiaIndustry = [
  { name: 'Shri. V.Vijayakumar', role: 'Chief Operating Officer', org: 'Symmetrix Technologies pvt.ltd' },
  { name: 'Shri.M.Thangachanr', role: 'M.D.', org: 'Torvin technologies pvt. Ltd.' },
  { name: 'Ms. Preethi M.', role: 'TBI', org: 'NIT Calicut' },
  { name: 'Mr. Rahul Dhir', role: 'Bharat Electronics India Pvt. Ltd', org: '(Proposed) Mentor' },
  { name: 'Mr.Aaron Joseph George', role: 'ICTI : International Centre for Technological Innovations Director', org: 'Mentor' },
  { name: 'Dr. Pallikonda Rajasekhar', role: 'RAJ BIOELECTRONICS & INTELLIGENT (P) LTD', org: 'Mentor' },
  { name: 'Dr.Girinath G. Pillai', role: 'Chief Scientific Officer', org: 'Zastra Innovations, Pvt. Ltd.' },
  { name: 'Mr.Prem Sankar', role: 'Co-founder of Waggle Lab', org: 'Mentor' },
  { name: 'Mrs.Manjula Nair', role: 'Founder & CEO REAL Buzzone', org: 'Marketing & Business Trainer Mentor' },
  { name: 'Mrs.Diksha Singh', role: 'Regional Director/ Head India Business Development of advance.ai', org: 'Mentor' },
  { name: 'Mr.Sandeep Sawant', role: 'Director:Product devt.', org: 'BMC Software India Pvt Ltd' },
  { name: 'Mr.Pallav Jagoori', role: 'VP of Products at GirnarSoft', org: 'Mentor' },
  { name: 'Mr.Raghunath C Nair', role: 'Deputy General Manager', org: 'Nissan Motor Corporation' },
  { name: 'Mrs.Latika Manaktala', role: 'Founder of Mistletoe', org: 'Digital Marketing & Growth Mentor' },
  { name: 'Dr.Abhiram Singamsetti', role: 'CEO and Chief Consultant at StartupWize', org: 'Mentor' },
  { name: 'Mr.Nagaprasad Sathyanarayana', role: 'Software Engineering Leader', org: 'Altimetrik India Pvt. Ltd' },
  { name: 'Dr.K C Chandrasekharan Nair', role: 'Chief Executive Officer, Trivandrum Technolodge', org: 'Mentor' },
  { name: 'Mr.Ashish Khare', role: 'Co-founder & COO @ IOT World Labs Inc.', org: 'Mentor' },
  { name: 'Mr.Darshan Kasaravalli', role: 'CEO at Valida Testing Solutions', org: 'Mentor' },
  { name: 'Mr.Rajesh Kumar', role: 'General Manager (F&A) at SAIL,BSP', org: 'Mentor' }
];

const indiaAcademic = [
  { name: 'Dr. Giridhar G', role: 'Dy.Director, SRRA, NIWE, Chennai' },
  { name: 'Dr. Hema Somanathan', role: 'IISER Trivandrum' },
  { name: 'Dr. Yogesh Simmhan', role: 'Assoc.Professor, IISc, Bangalore' },
  { name: 'Dr. Amey Karkare', role: 'Asst.Professor-IIT Kanpur' },
  { name: 'Dr. Brintha N.C.', role: 'KIT Srivilliputhur' },
  { name: 'Dr. V. Vasudevan', role: 'Dean, KLU Srivilliputhur' },
  { name: 'Dr. Rajkamal', role: 'IoT Specialist, Former VC, Devi Ahilya, Indore' },
  { name: 'Dr.Sengottuvelu', role: 'Professor, ABBS Bengaluru' },
  { name: 'Dr.Albert Raj', role: 'Principal, DMI Engineering College' },
  { name: 'Mr.Santhi', role: 'Professor, Kalasalingam Institute of Technology' },
  { name: 'Dr.Ranjit Abraham', role: 'Adhoc Faculty & consultant, IIITKottayam' },
  { name: 'Dr.N.C.Brintha', role: 'Asst.Professor, Kalasalingam Institute of Technology' },
  { name: 'Dr.Shobha', role: 'Professor, Karunya Institution of Technology and Science' },
  { name: 'Dr.Kannan', role: 'Asst.Professor, Amrita college of Engineering and Technology' },
  { name: 'Mr.Ceira Sara Cherian', role: 'Asst.Professor, TecH Institute of Science and Technology' },
  { name: 'Dr.P.Nagarajan', role: 'Vice Principal, DMI Engineering College' },
  { name: 'Dr.K.Deeba', role: 'Professor, Kalasalingam Institute of Technology' }
];

const MentorGrid = () => {
  return (
    <>
      <MemberCarousel members={intlIndustry} title="International Mentors - Industry" />
      <MemberCarousel members={intlAcademic} title="International Mentors - Academic" tone="grey" />
      <MemberCarousel members={indiaIndustry} title="India Mentors - Industry" />
      <MemberCarousel members={indiaAcademic} title="Indian Mentors - Academic" tone="grey" />
    </>
  );
};

export default MentorGrid;
