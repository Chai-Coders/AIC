import React, { useState } from 'react';

const HomeContact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(formData.email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setEmailError('');
    const recipients = 'incubate@iiitkottayam.ac.in,ceo-aic@iiikottayam.ac.in';
    const subject = encodeURIComponent(`Contact message from ${formData.name}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
    );

    window.location.href = `mailto:${recipients}?subject=${subject}&body=${body}`;
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <section id="contact" className="contact-section">
      <div className="container">
        <div className="contact-ornament" aria-hidden="true"><span></span><span></span><span></span></div>
        <div className="contact-intro">
          <h2>Contact Us</h2>
        </div>

        <div className="contact-form-wrap">
          {submitted && (
            <div className="contact-success" role="status">
              Thank you. Your message has been sent.
            </div>
          )}
          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="contact-form-row">
              <div className="contact-email-field">
                <input
                type="email"
                className="input"
                placeholder="Email*"
                required
                pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                aria-invalid={Boolean(emailError)}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setEmailError('');
                }}
                />
                {emailError && <span className="contact-error" role="alert">{emailError}</span>}
              </div>
              <div className="contact-email-field">
                <input
                  type="text"
                  className="input"
                  placeholder="Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <button type="submit" className="main-btn">Send Mail</button>
            </div>
            <textarea
              className="input"
              placeholder="Message"
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            ></textarea>
          </form>
        </div>
      </div>
    </section>
  );
};

export default HomeContact;
