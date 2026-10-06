import React, { useState } from 'react';
import SectionHeader from '../common/SectionHeader';
import { CONTACT, telHref } from '../../data/site';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY = { name: '', email: '', message: '' };

const HomeContact = () => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

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
    <section id="contact" className="section" aria-labelledby="contact-title">
      <div className="container contact">
        <div className="contact__info">
          <SectionHeader
            id="contact-title"
            eyebrow="Get in touch"
            title="Contact us"
            lead="Questions about incubation, partnerships or events? Reach out and our team will get back to you."
          />
          <ul className="contact__list">
            <li>
              <span className="icon-badge">
                <i className="fa fa-map-marker" aria-hidden="true" />
              </span>
              <div>
                <strong>Visit</strong>
                <a href={CONTACT.mapUrl} target="_blank" rel="noopener noreferrer">
                  {CONTACT.address.join(', ')}
                </a>
              </div>
            </li>
            <li>
              <span className="icon-badge">
                <i className="fa fa-envelope-o" aria-hidden="true" />
              </span>
              <div>
                <strong>Email</strong>
                {CONTACT.emails.map((email) => (
                  <a key={email} href={`mailto:${email}`}>
                    {email}
                  </a>
                ))}
              </div>
            </li>
            <li>
              <span className="icon-badge">
                <i className="fa fa-phone" aria-hidden="true" />
              </span>
              <div>
                <strong>Call</strong>
                <span className="contact__phones">
                  {CONTACT.phones.map((phone) => (
                    <a key={phone} href={telHref(phone)}>
                      {phone}
                    </a>
                  ))}
                </span>
              </div>
            </li>
          </ul>
        </div>

        <form className="card contact__form" onSubmit={handleSubmit} noValidate>
          <h3 className="card__title">Send us a message</h3>
          {sent && (
            <p className="callout" role="status">
              <i className="fa fa-check-circle" aria-hidden="true" />
              Your email app should open with the message ready to send. Thank you for reaching out!
            </p>
          )}
          <div className="contact__row">
            <div className="field">
              <label htmlFor="contact-name">Name</label>
              <input
                id="contact-name"
                className="input"
                autoComplete="name"
                value={form.name}
                onChange={update('name')}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'contact-name-error' : undefined}
              />
              {errors.name && <span id="contact-name-error" className="field-error">{errors.name}</span>}
            </div>
            <div className="field">
              <label htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                type="email"
                className="input"
                autoComplete="email"
                value={form.email}
                onChange={update('email')}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'contact-email-error' : undefined}
              />
              {errors.email && <span id="contact-email-error" className="field-error">{errors.email}</span>}
            </div>
          </div>
          <div className="field">
            <label htmlFor="contact-message">Message</label>
            <textarea
              id="contact-message"
              className="input"
              rows={5}
              value={form.message}
              onChange={update('message')}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? 'contact-message-error' : undefined}
            />
            {errors.message && <span id="contact-message-error" className="field-error">{errors.message}</span>}
          </div>
          <button type="submit" className="btn btn--primary">
            Send message <i className="fa fa-paper-plane" aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  );
};

export default HomeContact;
