import React from 'react';

const SiaContent = () => {
  return (
    <div id="blog" className="section md-padding">
      <div className="container">
        <div className="row">
          <main id="main" className="col-md-12">
            <div className="blog">
              <div className="blog-content" style={{ marginBottom: '30px' }}>
                {/* Intro Highlight Banner */}
                <div style={{ background: '#F8FAFC', padding: '24px 28px', borderRadius: '8px', borderLeft: '4px solid #0077B6', marginBottom: '24px' }}>
                  <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#334155', margin: 0 }}>
                    <strong>AIC-IIIT Kottayam</strong> is inviting applications for its 1st cohort of <strong>SIA (Start-Up-In AIC)</strong>. AIC (Atal Incubation Centre) IIIT Kottayam is a Section 8 non-profit organization under the AIM-NITI Aayog scheme of the Government of India. SIA is a comprehensive support scheme for budding entrepreneurs, innovators, and early-stage startup teams at AIC-IIIT Kottayam.
                  </p>
                </div>

                {/* Grid of Key Features & Program Flow */}
                <div className="row" style={{ marginBottom: '24px' }}>
                  <div className="col-md-6" style={{ marginBottom: '20px' }}>
                    <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
                      <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                        <i className="fa fa-check-circle" style={{ color: '#0077B6', marginRight: '10px' }}></i>
                        KEY FEATURES
                      </h4>
                      <ul style={{ color: '#334155', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.8', margin: 0 }}>
                        <li>Structured Launch Program in partnership with Global Leaders</li>
                        <li>Complete support from Idea Validation, IP, Marketing, Seed funding and Acceleration</li>
                        <li>Mentoring, Company Formation, and Incubation facilities</li>
                        <li>Completely free company registration and incubation for selected teams*</li>
                        <li>50+ member mentor panel of Global leaders in various domains</li>
                        <li>Virtual and Physical Incubation facilities</li>
                        <li>Office space, Prototyping labs, and Makerspace access</li>
                        <li>Support provided to innovative ideas from all domains</li>
                      </ul>
                    </div>
                  </div>

                  <div className="col-md-6" style={{ marginBottom: '20px' }}>
                    <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
                      <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                        <i className="fa fa-refresh" style={{ color: '#0077B6', marginRight: '10px' }}></i>
                        PROGRAM FLOW &amp; ENGAGEMENTS
                      </h4>
                      <ul style={{ color: '#334155', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.8', margin: 0 }}>
                        <li>Application screening and cohort onboarding</li>
                        <li>Structured mentoring with domain experts and seasoned founders</li>
                        <li>Product validation, prototype support, and market readiness</li>
                        <li>Business model refinement with branding and go-to-market guidance</li>
                        <li>Demo day readiness and investor/startup ecosystem connect</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Grid of Expected Outcome & Cohort Scope */}
                <div className="row" style={{ marginBottom: '24px' }}>
                  <div className="col-md-6" style={{ marginBottom: '20px' }}>
                    <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
                      <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                        <i className="fa fa-trophy" style={{ color: '#EAB308', marginRight: '10px' }}></i>
                        EXPECTED OUTCOME
                      </h4>
                      <ul style={{ color: '#334155', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.8', margin: 0 }}>
                        <li>Startup ideas transformed into validated, viable business opportunities</li>
                        <li>Teams become investment-ready and incubation-ready</li>
                        <li>Stronger product-market fit with a clear commercialization roadmap</li>
                        <li>Entrepreneurial capability development for sustainable long-term scaling</li>
                      </ul>
                    </div>
                  </div>

                  <div className="col-md-6" style={{ marginBottom: '20px' }}>
                    <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
                      <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                        <i className="fa fa-lightbulb-o" style={{ color: '#0077B6', marginRight: '10px' }}></i>
                        WHO CAN APPLY
                      </h4>
                      <ul style={{ color: '#334155', paddingLeft: '20px', fontSize: '15px', lineHeight: '1.8', margin: 0 }}>
                        <li>Aspiring student entrepreneurs and academic innovators</li>
                        <li>Early-stage startup teams with functional or pre-MVP concepts</li>
                        <li>Founders seeking seed support, mentorship, and cloud/lab infrastructure</li>
                        <li>Innovators across IoT, AI/ML, Healthcare, AgriTech, CleanTech, and allied domains</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Important Notice Box */}
                <div style={{ background: '#EFF6FF', padding: '14px 20px', borderRadius: '8px', border: '1px solid #BFDBFE', marginBottom: '28px' }}>
                  <p style={{ fontSize: '14px', color: '#1E40AF', margin: 0, fontWeight: '500' }}>
                    <i className="fa fa-info-circle" style={{ marginRight: '8px' }}></i>
                    *Stamp Duty and statutory government fees, if any, are not included in the fee waiver.
                  </p>
                </div>

                {/* Application Link CTA Banner */}
                <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <h4 style={{ fontWeight: '700', color: '#0F172A', marginBottom: '12px' }}>
                    Ready to Apply for Start-Up In AIC (SIA)?
                  </h4>
                  <p style={{ fontSize: '15px', color: '#475569', marginBottom: '16px' }}>
                    Submit your application for the 1st Cohort of SIA and fast-track your entrepreneurial journey with AIC-IIIT Kottayam.
                  </p>
                  <a 
                    href="https://docs.google.com/forms/d/e/1FAIpQLScMg2bbHeF0wbV_feQlbAcHz1ro78PdpYNEwKni870ZSvl4mg/viewform" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="main-btn"
                    style={{ display: 'inline-block', padding: '10px 28px', fontSize: '15px' }}
                  >
                    Apply on Google Forms <i className="fa fa-external-link" style={{ marginLeft: '8px' }}></i>
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

export default SiaContent;
