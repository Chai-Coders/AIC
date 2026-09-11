import React from 'react';

const SummaryContent = () => {
  return (
    <div id="blog" className="section md-padding">
      <div className="container">
        <div className="row">
          <main id="main" className="col-md-12">
            <div className="blog">
              <div className="blog-content" style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', marginBottom: '16px' }}>
                  About AIC-IIITKottayam Incubation Centre
                </h3>
                <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#334155' }}>
                  The incubation centre, AIC IIITKottayam Foundation, is a non-profit Sec.8 company. It is sanctioned under the Atal Innovation Mission scheme of Govt. of India. The centre will address the existing problems of entrepreneurs by providing them sufficient input in terms of knowledge, guidance, mentoring, training, and demonstrations. In addition, the space and facility will be provided to them. The centre will incubate customers to increase the utility of technology relating to IoT and Cloud solutions for societal benefits.
                </p>
                <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#334155' }}>
                  Incubates at AIC-IIITKottayam will get opportunities to create their prototype and implement them after a thorough market analysis is achieved from their end. The product prototype could be initially designed with a 3D printer (if required); the software prototype could be designed at the computing space available at AIC-IIITKottayam; and, the real implementation could be carried out at the hardware level.
                </p>
                <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#334155' }}>
                  In addition, the software services, including platform services, will be designed considering the end-to-end holistic picture of the product in the mind. Later, the models will be exhibited jointly with the sales department of AIC-IIITKottayam.
                </p>
              </div>

              {/* Two Column Layout for Host Institute & Vision/Mission */}
              <div className="row" style={{ marginBottom: '30px' }}>
                <div className="col-md-6">
                  <div className="blog-content" style={{ height: '100%', padding: '28px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <h4 style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', marginBottom: '14px' }}>
                      About Host Institute
                    </h4>
                    <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#334155' }}>
                      AIC-IIITKottayam is hosted by the Indian Institute of Information Technology Kottayam (IIITKottayam). In general, IIITs are declared as Institutes of national importance and organized as a conglomerate of researchers and students with administrative and academic bodies to guide itself. Presently IIIT-Kottayam is managed by Prof. Dr. Rajiv V. Dharaskar, Director-IIITKottayam, and Dr. M. Radhakrishnan, Registrar, IIITKottayam, Prof. P. Mohanan (Prof. Incharge, IIIT-Kottayam).
                    </p>
                    <a 
                      href="http://www.iiitkottayam.ac.in/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="main-btn"
                      style={{ display: 'inline-block', marginTop: '12px', padding: '8px 20px', fontSize: '14px' }}
                    >
                      Visit Host Institute <i className="fa fa-external-link" style={{ marginLeft: '6px' }}></i>
                    </a>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="blog-content" style={{ height: '100%', padding: '28px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <h4 style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', marginBottom: '14px' }}>
                      Vision &amp; Mission
                    </h4>
                    <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#334155', marginBottom: '14px' }}>
                      <strong>Vision:</strong> To develop an international business hub for entrepreneurs by providing strong technical innovations that improves the societies/communities at large.
                    </p>
                    <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#334155', margin: 0 }}>
                      <strong>Mission:</strong>
                    </p>
                    <ul style={{ fontSize: '14px', lineHeight: '1.7', color: '#334155', paddingLeft: '20px', marginTop: '6px' }}>
                      <li>To provide technical support and research thoughts to young entrepreneurial minds of India.</li>
                      <li>To provide a platform for accessing international business centres from our region.</li>
                      <li>To motivate young researchers and entrepreneurs to help our society with business thoughts.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Research Objectives & Workbench Full-Width Grid */}
              <div className="row" style={{ marginBottom: '30px' }}>
                <div className="col-md-6">
                  <div className="blog-img" style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#0F172A', marginBottom: '10px' }}>
                      Research Objectives
                    </h3>
                    <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#334155' }}>
                      The main focus of AIC-IIITKottayam would be to develop societal applications using IoT cloud technologies or similar high-end technologies.
                    </p>
                    <img className="img-responsive" src="/img/blog-post.jpg" alt="Research Objectives" style={{ width: '100%', borderRadius: '8px', marginTop: '10px' }} />
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="blog-content" style={{ padding: '28px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', height: '100%' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#0F172A', marginBottom: '14px' }}>
                      AIC-IIITKottayam Workbench
                    </h3>
                    <p style={{ fontSize: '15px', color: '#334155', marginBottom: '12px' }}>
                      AIC-IIITKottayam workbench provides the following support to incubates:
                    </p>
                    <ul style={{ fontSize: '14px', lineHeight: '1.8', color: '#334155', paddingLeft: '20px' }}>
                      <li>Market analysis</li>
                      <li>Consultation</li>
                      <li>3D printing - Hardware model realization</li>
                      <li>Feasibility analysis</li>
                      <li>Technical Advice</li>
                      <li>Implementation support of IoT Cloud services</li>
                      <li>Verification and Automation analysis</li>
                      <li>Business and marketing</li>
                    </ul>
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
