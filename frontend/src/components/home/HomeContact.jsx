import React, { useEffect, useState } from 'react';
import { CONTACT, telHref } from '../../data/site';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY = { name: '', email: '', message: '' };

const HomeContact = () => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  // Hide the success note again after a few seconds.
  useEffect(() => {
    if (!sent) return undefined;
    const timer = setTimeout(() => setSent(false), 6000);
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

  const field = (name, label, { as: Tag = 'input', ...rest } = {}) => {
    return (
      <div className="field">
        <label htmlFor={`contact-${name}`}>{label}</label>
        <Tag
          id={`contact-${name}`}
          className="input"
          value={form[name]}
          onChange={update(name)}
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `contact-${name}-error` : undefined}
          {...rest}
        />
        {errors[name] && (
          <span id={`contact-${name}-error`} className="field-error" role="alert">
            {errors[name]}
          </span>
        )}
      </div>
    );
  };

  return (
    <section id="contact" className="section section--white" aria-labelledby="contact-title">
      <div className="container contact">
        <div className="contact__info">
          <p className="eyebrow">Contact</p>
          <h2 id="contact-title" className="section-title">
            Talk to the team
          </h2>
          <p className="section-lead">
            Questions about a programme, eligibility or a partnership? Write to us, call, or visit the centre on the IIIT
            Kottayam campus.
          </p>

          <dl className="contact__details">
            <div>
              <dt>Address</dt>
              <dd>
                {CONTACT.address.join(' ')}{' '}
                <a href={CONTACT.mapUrl} target="_blank" rel="noopener noreferrer" className="text-link">
                  Directions <i className="fa fa-external-link" aria-hidden="true" />
                </a>
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                {CONTACT.emails.map((email) => (
                  <a key={email} href={`mailto:${email}`}>
                    {email}
                  </a>
                ))}
              </dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>
                {CONTACT.phones.map((phone) => (
                  <a key={phone} href={telHref(phone)}>
                    {phone}
                  </a>
                ))}
              </dd>
            </div>
          </dl>

          <iframe
            className="contact__map"
            src={CONTACT.mapEmbedUrl}
            title="AIC-IIITK location on Google Maps"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <form className="contact__form" onSubmit={handleSubmit} noValidate>
          <h3 className="contact__form-title">Send us a message</h3>
          <div className="contact__row">
            {field('name', 'Your name', { type: 'text', autoComplete: 'name' })}
            {field('email', 'Email address', { type: 'email', autoComplete: 'email' })}
          </div>
          {field('message', 'Message', { as: 'textarea', rows: 6 })}
          <button type="submit" className="btn btn--primary">
            Send message <i className="fa fa-arrow-right" aria-hidden="true" />
          </button>
          {sent && (
            <p className="contact__success" role="status">
              Your email app should open with the message ready to send. Thank you for reaching out.
            </p>
          )}
        </form>
      </div>
    </section>
  );
};

export default HomeContact;
