import React, { useEffect, useState } from 'react';
import { MAP_EMBED_URL, MAP_URL, telHref } from '../../data/site';
import { cmsKey, useList } from '../../content/useText';
import { Editable, Text } from '../../content/Text';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY = { name: '', email: '', message: '' };

const HomeContact = () => {
  const list = useList();
  const emails = list('contact.emails');
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
    window.location.href = `mailto:${emails.join(',')}?subject=${subject}&body=${body}`;
    setSent(true);
    setForm(EMPTY);
  };

  const field = (name, labelKey, { as: Tag = 'input', ...rest } = {}) => {
    return (
      <div className="field">
        <label htmlFor={`contact-${name}`}>
          <Text k={labelKey} />
        </label>
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
          <p className="eyebrow">
            <Text k="home.contact.eyebrow" />
          </p>
          <h2 id="contact-title" className="section-title">
            <Text k="home.contact.title" />
          </h2>
          <p className="section-lead">
            <Text k="home.contact.lead" />
          </p>

          <dl className="contact__details">
            <div>
              <dt>
                <Text k="home.contact.address" />
              </dt>
              <dd>
                <Editable k="contact.address">{list('contact.address').join(' ')}</Editable>{' '}
                <a href={MAP_URL} target="_blank" rel="noopener noreferrer" className="text-link">
                  <Text k="home.contact.directions" /> <i className="fa fa-external-link" aria-hidden="true" />
                </a>
              </dd>
            </div>
            <div>
              <dt>
                <Text k="home.contact.email" />
              </dt>
              <dd {...cmsKey('contact.emails')}>
                {emails.map((email) => (
                  <a key={email} href={`mailto:${email}`}>
                    {email}
                  </a>
                ))}
              </dd>
            </div>
            <div>
              <dt>
                <Text k="home.contact.phone" />
              </dt>
              <dd {...cmsKey('contact.phones')}>
                {list('contact.phones').map((phone) => (
                  <a key={phone} href={telHref(phone)}>
                    {phone}
                  </a>
                ))}
              </dd>
            </div>
          </dl>

          <iframe
            className="contact__map"
            src={MAP_EMBED_URL}
            title="AIC-IIITK location on Google Maps"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <form className="contact__form" onSubmit={handleSubmit} noValidate>
          <h3 className="contact__form-title">
            <Text k="home.contact.form.title" />
          </h3>
          {field('name', 'home.contact.form.name', { type: 'text', autoComplete: 'name' })}
          {field('email', 'home.contact.form.email', { type: 'email', autoComplete: 'email' })}
          {field('message', 'home.contact.form.message', { as: 'textarea', rows: 6 })}
          <button type="submit" className="btn btn--primary">
            <Text k="home.contact.form.send" /> <i className="fa fa-arrow-right" aria-hidden="true" />
          </button>
          {sent && (
            <p className="contact__success" role="status">
              <Text k="home.contact.form.sent" />
            </p>
          )}
        </form>
      </div>
    </section>
  );
};

export default HomeContact;
