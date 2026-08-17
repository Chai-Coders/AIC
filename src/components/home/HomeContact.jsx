import React, { useState } from 'react';

const HomeContact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div id="contact" className="section md-padding">
      <div className="container">
        <div className="row">
          <div className="section-header text-center">
            <h2 className="title">Contact Us</h2>
          </div>

          <div className="col-sm-4">
            <div className="contact">
              <i className="fa fa-phone"></i>
              <h3>Phone/Whatsapp</h3>
              <p>+91-482-2202156, +91-482-2202155, +91-9400063494, +91-9443543746</p>
            </div>
          </div>

          <div className="col-sm-4">
            <div className="contact">
              <i className="fa fa-envelope"></i>
              <h3>Email</h3>
              <a href="mailto:incubate@iiitkottayam.ac.in">
                <p>incubate@iiitkottayam.ac.in,<br />ceo-aic@iiikottayam.ac.in</p>
              </a>
            </div>
          </div>

          <div className="col-sm-4">
            <div className="contact">
              <i className="fa fa-map-marker"></i>
              <h3>Address</h3>
              <p>Building no.340,<br />Karoor Valavoor.P.O.,<br />Kottayam, Kerala 686635.</p>
            </div>
          </div>

          <div className="col-md-8 col-md-offset-2">
            {submitted && (
              <div className="alert alert-success text-center">
                Thank you! Your message has been sent to incubate@iiitkottayam.ac.in.
              </div>
            )}
            <form className="contact-form" onSubmit={handleSubmit}>
              <input 
                type="text" 
                className="input" 
                placeholder="Name" 
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <input 
                type="email" 
                className="input" 
                placeholder="Email" 
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <input 
                type="text" 
                className="input" 
                placeholder="Subject" 
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
              <textarea 
                className="input" 
                placeholder="Send message to incubate@iiitkottayam.ac.in" 
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              ></textarea>
              <input type="submit" className="main-btn" value="Send message" />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeContact;
