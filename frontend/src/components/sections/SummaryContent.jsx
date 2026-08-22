import React from 'react';
import Sidebar from '../common/Sidebar';

const SummaryContent = () => {
  return (
    <div id="blog" className="section md-padding">
      <div className="container">
        <div className="row">
          <main id="main" className="col-md-9">
            <div className="blog">
              <div className="blog-content">
                <br />
                <h3>About AIC-IIITKottayam Incubation Centre</h3>
                <p>
                  The incubation centre, AIC IIITKottayam Foundation, is a non-profit Sec.8 company. It is sanctioned under the Atal Innovation Mission scheme of Govt. of India. The centre will address the existing problems of entrepreneurs by providing them sufficient input in terms of knowledge, guidance, mentoring, training, and demonstrations. In addition, the space and facility will be provided to them. The centre will incubate customers to increase the utility of technology relating to IoT and Cloud solutions for societal benefits.
                </p>
                <p>
                  Incubates at AIC-IIITKottayam will get opportunities to create their prototype and implement them after a thorough market analysis is achieved from their end. The product prototype could be initially designed with a 3D printer (if required); the software prototype could be designed at the computing space available at AIC-IIITKottayam; and, the real implementation could be carried out at the hardware level.
                </p>
                <p>
                  In addition, the software services, including platform services, will be designed considering the end-to-end holistic picture of the product in the mind. Later, the models will be exhibited jointly with the sales department of AIC-IIITKottayam.
                </p>
                <br />

                <h4> About Host Institute </h4>
                <p>
                  AIC-IIITKottayam is hosted by the Indian Institute of Information Technology Kottayam (IIITKottayam). In general, IIITs are declared as Institutes of national importance and organized as a conglomerate of researchers and students with administrative and academic bodies to guide itself. Presently IIIT-Kottayam is managed by Prof. Dr. Rajiv V. Dharaskar, Director-IIITKottayam, and Dr. M. Radhakrishnan, Registrar, IIITKottayam, Prof. P. Mohanan (Prof. Incharge, IIIT-Kottayam). For more details about the host institute, please visit <a href="http://www.iiitkottayam.ac.in/" target="_blank" rel="noopener noreferrer"> here </a>.
                </p>

                <h4>Vision - Mission</h4>
                <p>
                  The vision of AIC-IIITKottayam is stated as follows: <br />
                  To develop an international business hub for entrepreneurs by providing strong technical innovations that improves the societies/communities at large.
                </p>
                <p>
                  The mission of AIC-IIITKottayam is stated as follows:
                  <ul>
                    <li> To provide technical support and research thoughts to young entrepreneurial minds of India. </li>
                    <li> To provide a platform for accessing international business centres from our region. </li>
                    <li> To motivate young researchers and entrepreneurs to help our society with business thoughts. </li>
                  </ul>
                </p>
              </div>

              <div className="blog-img">
                <h3>Research Objectives of AIC-IIITKottayam</h3>
                <p>
                  The main focus of AIC-IIITKottayam would be to develop societal applications using IoT cloud technologies or similar high-end technologies.
                </p>
                <img className="img-responsive" src="/img/blog-post.jpg" alt="Research Objectives" />
              </div>

              <div className="blog-content">
                <br />
                <h3>AIC-IIITKottayam Workbench</h3>
                <p>
                  AIC-IIITKottayam workbench provides the following support to the incubates:
                  <ul>
                    <li> Market analysis </li>
                    <li> Consultation </li>
                    <li> 3D printing - Hardware model realization </li>
                    <li> Feasibility analysis </li>
                    <li> Technical Advise </li>
                    <li> Implementation support of IoT Cloud services </li>
                    <li> Verification and Automation analysis </li>
                    <li> Business and marketing </li>
                  </ul>
                </p>
              </div>

              <div className="blog-tags">
                <h5>AIC-IIITKottayam Details :</h5>
                <a href="#tags" onClick={(e) => e.preventDefault()}><i className="fa fa-tag"></i>AIC-IIITKottayam Workbench</a>
                <a href="#tags" onClick={(e) => e.preventDefault()}><i className="fa fa-tag"></i>Analysis</a>
                <a href="/#team"><i className="fa fa-tag"></i>Partners</a>
                <a href="/#team"><i className="fa fa-tag"></i>Mentors</a>
                <a href="/gallery.html"><i className="fa fa-tag"></i>Gallery</a>
              </div>

              <div className="reply-form">
                <h3 className="title">Leave a reply</h3>
                <form onSubmit={(e) => { e.preventDefault(); alert('Message submitted!'); }}>
                  <input className="input" type="text" placeholder="Name" required />
                  <input className="input" type="email" placeholder="Email" required />
                  <textarea placeholder="Message to incubate@iiitkottayam.ac.in" required></textarea>
                  <button type="submit" className="main-btn">Submit</button>
                </form>
              </div>
            </div>
          </main>

          <Sidebar />
        </div>
      </div>
    </div>
  );
};

export default SummaryContent;
