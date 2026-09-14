import React from 'react';

const CareersContent = () => {
  return (
    <div id="blog" className="section md-padding">
      <div className="container">
        <div className="row">
          <main id="main" className="col-md-12">
            <div className="blog">
              <div className="blog-content" style={{ marginBottom: '30px' }}>
                {/* Intro Highlight Banner - Open Positions */}
                <div style={{ background: '#F8FAFC', padding: '24px 28px', borderRadius: '8px', borderLeft: '4px solid #0077B6', marginBottom: '24px' }}>
                  <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '12px' }}>
                    <i className="fa fa-briefcase" style={{ color: '#0077B6', marginRight: '10px' }}></i>
                    POSITIONS AT AIC
                  </h4>
                  <ul style={{ color: '#334155', fontSize: '15px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
                    <li>
                      <strong>CEO Position</strong> —{' '}
                      <a href="/pdfs/CEO-Position.pdf" target="_blank" rel="noopener noreferrer" style={{ color: '#0077B6', fontWeight: '600' }}>
                        Visit here for details <i className="fa fa-file-pdf-o" style={{ marginLeft: '4px' }}></i>
                      </a>{' '}
                      (Submit resumes before 25.12.2025)
                    </li>
                    <li>
                      <strong>Non-Stipendiary Internship Program</strong> — Open for MCA, MSc (Comp/IT), BE/BTech students &amp; recent graduates.
                    </li>
                  </ul>
                </div>

                {/* Internship Duration Info Banner */}
                <div style={{ background: '#EFF6FF', padding: '16px 24px', borderRadius: '8px', border: '1px solid #BFDBFE', marginBottom: '28px' }}>
                  <p style={{ fontSize: '15px', color: '#1E40AF', margin: 0, fontWeight: '500' }}>
                    <i className="fa fa-clock-o" style={{ marginRight: '8px' }}></i>
                    <strong>Internship Program Commitment:</strong> Availability of at least 2 to 3 months or more for the internship program (Full time — Monday to Friday).
                  </p>
                </div>

                {/* Grid 1: Objectives & Qualifications */}
                <div className="row" style={{ marginBottom: '24px' }}>
                  <div className="col-md-6" style={{ marginBottom: '20px' }}>
                    <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
                      <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                        <i className="fa fa-bullseye" style={{ color: '#0077B6', marginRight: '10px' }}></i>
                        OBJECTIVES OF INTERNSHIP
                      </h4>
                      <ul style={{ color: '#334155', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.8', margin: 0 }}>
                        <li>Working on day-to-day activities of Atal Incubation Centre alongside real product development</li>
                        <li>Hands-on technical development in: Java, Web/JavaScript frameworks, Python, Machine Learning, Android App Development, IoT, and Blockchain</li>
                      </ul>
                    </div>
                  </div>

                  <div className="col-md-6" style={{ marginBottom: '20px' }}>
                    <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
                      <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                        <i className="fa fa-graduation-cap" style={{ color: '#0077B6', marginRight: '10px' }}></i>
                        QUALIFICATION &amp; ELIGIBILITY
                      </h4>
                      <ul style={{ color: '#334155', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.8', margin: 0 }}>
                        <li>Students doing their final Semester Projects: MCA / MSc (Comp/IT) / BE / B.Tech (CSE, IT, EEE, EC)</li>
                        <li>Recent graduates passionate about innovation, technology, and startup ecosystems</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Grid 2: Responsibilities & Perks */}
                <div className="row" style={{ marginBottom: '28px' }}>
                  <div className="col-md-6" style={{ marginBottom: '20px' }}>
                    <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
                      <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                        <i className="fa fa-tasks" style={{ color: '#0077B6', marginRight: '10px' }}></i>
                        RESPONSIBILITIES &amp; SKILLS
                      </h4>
                      <ul style={{ color: '#334155', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.8', margin: 0 }}>
                        <li>Working on active product development (Front-end, Back-end, IoT and AI projects)</li>
                        <li>Key skills required: Good communication, fast learning, mentoring, and technical documentation</li>
                      </ul>
                    </div>
                  </div>

                  <div className="col-md-6" style={{ marginBottom: '20px' }}>
                    <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
                      <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                        <i className="fa fa-star" style={{ color: '#EAB308', marginRight: '10px' }}></i>
                        PERKS &amp; BENEFITS
                      </h4>
                      <ul style={{ color: '#334155', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.8', margin: 0 }}>
                        <li>Official Internship Experience Certificate from AIC-IIITKottayam</li>
                        <li>Flexible working hours with hands-on exposure to live startup projects</li>
                        <li>Networking opportunities with tech mentors and industry leaders</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Application Link CTA Banner */}
                <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <h4 style={{ fontWeight: '700', color: '#0F172A', marginBottom: '12px' }}>
                    Interested in Joining or Interning at AIC?
                  </h4>
                  <p style={{ fontSize: '15px', color: '#475569', marginBottom: '16px' }}>
                    Submit your resume to <strong>shajulin@iiitkottayam.ac.in</strong> and <strong>incubate@iiitkottayam.ac.in</strong>
                  </p>
                  <a
                    href="mailto:incubate@iiitkottayam.ac.in?subject=Application for Career / Internship at AIC-IIITK"
                    className="main-btn"
                    style={{ display: 'inline-block', padding: '10px 28px', fontSize: '15px' }}
                  >
                    Submit Resume via Email <i className="fa fa-envelope" style={{ marginLeft: '8px' }}></i>
                  </a>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CareersContent;
