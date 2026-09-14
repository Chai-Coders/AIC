import React from 'react';

const SummaryContent = () => {
  return (
    <div id="blog" className="section md-padding">
      <div className="container">
        <div className="row">
          <main id="main" className="col-md-12">
            <div className="blog">
              <div className="blog-content" style={{ marginBottom: '30px' }}>
                {/* Intro Highlight Banner */}
                <div style={{ background: '#F8FAFC', padding: '24px 28px', borderRadius: '8px', borderLeft: '4px solid #0077B6', marginBottom: '28px' }}>
                  <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#0F172A', marginBottom: '12px' }}>
                    About AIC-IIITKottayam Incubation Centre
                  </h3>
                  <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#334155', marginBottom: '12px' }}>
                    The incubation centre, <strong>AIC IIITKottayam Foundation</strong>, is a non-profit Section 8 company sanctioned under the <strong>Atal Innovation Mission (AIM)</strong> scheme of the Government of India. The centre addresses real-world problems of entrepreneurs by providing extensive support in knowledge, guidance, mentorship, hands-on training, and state-of-the-art incubation infrastructure.
                  </p>
                  <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#475569', margin: 0 }}>
                    Incubatees at AIC-IIITKottayam gain opportunities to rapidly prototype and test their products—utilizing 3D printing, advanced computing facilities, hardware realization labs, and IoT cloud platforms—backed by commercialization and go-to-market advisory.
                  </p>
                </div>

                {/* Two Column Layout for Host Institute & Vision/Mission */}
                <div className="row" style={{ marginBottom: '24px' }}>
                  <div className="col-md-6" style={{ marginBottom: '20px' }}>
                    <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
                      <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                        <i className="fa fa-university" style={{ color: '#0077B6', marginRight: '10px' }}></i>
                        ABOUT HOST INSTITUTE
                      </h4>
                      <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#334155', marginBottom: '16px' }}>
                        AIC-IIITKottayam is hosted by the <strong>Indian Institute of Information Technology Kottayam (IIITKottayam)</strong>, an Institute of National Importance. Managed by visionary academic and research leadership, IIIT Kottayam fosters multidisciplinary technological innovation and entrepreneurial excellence.
                      </p>
                      <a 
                        href="http://www.iiitkottayam.ac.in/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="main-btn"
                        style={{ display: 'inline-block', padding: '8px 20px', fontSize: '14px' }}
                      >
                        Visit Host Institute <i className="fa fa-external-link" style={{ marginLeft: '6px' }}></i>
                      </a>
                    </div>
                  </div>

                  <div className="col-md-6" style={{ marginBottom: '20px' }}>
                    <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
                      <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                        <i className="fa fa-compass" style={{ color: '#0077B6', marginRight: '10px' }}></i>
                        VISION &amp; MISSION
                      </h4>
                      <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#334155', marginBottom: '12px' }}>
                        <strong>Vision:</strong> To develop an international business hub for entrepreneurs by providing strong technical innovations that improve society and communities at large.
                      </p>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A', marginBottom: '6px' }}>
                        Mission:
                      </p>
                      <ul style={{ color: '#334155', paddingLeft: '20px', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
                        <li>Provide cutting-edge technical support and research guidance to young minds.</li>
                        <li>Serve as a gateway connecting regional startups to global business hubs.</li>
                        <li>Empower entrepreneurs to solve real societal challenges through technology.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Research Objectives & Workbench Full-Width Grid */}
                <div className="row" style={{ marginBottom: '30px' }}>
                  <div className="col-md-6" style={{ marginBottom: '20px' }}>
                    <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
                      <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                        <i className="fa fa-flask" style={{ color: '#0077B6', marginRight: '10px' }}></i>
                        RESEARCH OBJECTIVES
                      </h4>
                      <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#334155', marginBottom: '14px' }}>
                        The core focus of AIC-IIITKottayam is developing high-impact societal applications using IoT, Cloud architectures, AI/ML, and cyber-physical systems.
                      </p>
                      <img 
                        className="img-responsive" 
                        src="/img/blog-post.jpg" 
                        alt="Research Objectives" 
                        style={{ width: '100%', borderRadius: '6px', border: '1px solid #E2E8F0' }} 
                      />
                    </div>
                  </div>

                  <div className="col-md-6" style={{ marginBottom: '20px' }}>
                    <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
                      <h4 style={{ color: '#0F172A', fontWeight: '700', fontSize: '18px', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
                        <i className="fa fa-cogs" style={{ color: '#0077B6', marginRight: '10px' }}></i>
                        AIC-IIITKOTTAYAM WORKBENCH
                      </h4>
                      <p style={{ fontSize: '15px', color: '#334155', marginBottom: '12px' }}>
                        AIC-IIITKottayam workbench provides end-to-end support to incubatees:
                      </p>
                      <ul style={{ color: '#334155', paddingLeft: '20px', fontSize: '14px', lineHeight: '1.8', margin: 0 }}>
                        <li>Market opportunity &amp; customer need analysis</li>
                        <li>One-on-one mentor &amp; domain consultation</li>
                        <li>3D printing and rapid hardware prototype realization</li>
                        <li>Technical architecture &amp; feasibility verification</li>
                        <li>IoT Cloud services integration and automated testing</li>
                        <li>Intellectual Property (IP) and commercialization support</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SummaryContent;
