import React, { useEffect, useState } from 'react';
import { CONTACT } from '../../data/site';
import './HomeContact.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY = { name: '', email: '', message: '' };

const HomeContact = () => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  // Hide the success note again after a few seconds.
  useEffect(() => {
    if (!sent) return undefined;
    const timer = setTimeout(() => setSent(false), 5000);
    return () => clearTimeout(timer);
  }, [sent]);

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Please enter your name.';
    if (!EMAIL_PATTERN.test(form.email)) next.email = 'Please enter a valid email address.';
    if (!form.message.trim()) next.message = 'Please write a short message.';
    setErrors(next);
    if (Object.keys(next).length) return;

    // There is no mail API on the backend, so hand the message to the visitor's email app.
    const subject = encodeURIComponent(`Contact message from ${form.name}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\nMessage:\n${form.message}`);
    window.location.href = `mailto:${CONTACT.emails.join(',')}?subject=${subject}&body=${body}`;
    setSent(true);
    setForm(EMPTY);
  };

  return (
    <section id="contact" className="contact-section" aria-labelledby="contact-title">
      <div className="contact-ornament" aria-hidden="true"><span></span><span></span><span></span></div>

      <div className="contact-inner">
        <div className="contact-intro">
          <h2 id="contact-title">Contact Us</h2>
        </div>

        <div className="contact-form-wrap">
          {sent && (
            <p className="contact-success" role="status">
              Your email app should open with the message ready to send. Thank you for reaching out!
            </p>
          )}

          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="contact-form-row">
              <div className="contact-field">
                <input
                  id="contact-email"
                  type="email"
                  className="contact-input"
                  placeholder="Email*"
                  aria-label="Email"
                  autoComplete="email"
                  value={form.email}
                  onChange={update('email')}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'contact-email-error' : undefined}
                />
                {errors.email && (
                  <span id="contact-email-error" className="contact-error" role="alert">{errors.email}</span>
                )}
              </div>

              <div className="contact-field">
                <input
                  id="contact-name"
                  type="text"
                  className="contact-input"
                  placeholder="Name"
                  aria-label="Name"
                  autoComplete="name"
                  value={form.name}
                  onChange={update('name')}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'contact-name-error' : undefined}
                />
                {errors.name && (
                  <span id="contact-name-error" className="contact-error" role="alert">{errors.name}</span>
                )}
              </div>

              <button type="submit" className="contact-submit">Send Mail</button>
            </div>

            <div className="contact-message">
              <textarea
                id="contact-message"
                className="contact-input"
                placeholder="Message"
                aria-label="Message"
                value={form.message}
                onChange={update('message')}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
              />
              {errors.message && (
                <span id="contact-message-error" className="contact-error" role="alert">{errors.message}</span>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default HomeContact;
