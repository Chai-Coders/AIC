import React, { useEffect, useRef, useState } from 'react';
import './MemberCarousel.css';

// Carousel presentation of people (team, mentors, board of governors), ported from the main branch.

const initialsFor = (name) => name
  .replace(/^(Prof\. Dr\.|Prof\.|Dr\.|Mrs\.|Ms\.|Mr\.|Shri\.)\s*/i, '')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase();

const boardDescriptionFor = (member) => {
  const primary = member.org || member.designation || member.role || '';
  const secondary = member.designation && member.org ? member.designation : '';
  const detail = [primary, secondary].filter(Boolean).join(' - ');
  // The overlay already shows the role, so don't repeat it underneath the portrait.
  return detail === (member.role || member.designation || '') ? '' : detail;
};

const MemberCard = ({ member, className = '', boardLayout = false }) => {
  if (boardLayout) {
    const subtitle = member.role || member.designation || '';
    const detail = boardDescriptionFor(member);

    return (
      <article className={`member-carousel-card member-carousel-card--board ${className}`.trim()}>
        <div className="member-carousel-portrait member-carousel-portrait--board">
          {member.img ? (
            <img src={member.img} alt={member.name} loading="lazy" decoding="async" />
          ) : (
            <span aria-hidden="true">{initialsFor(member.name)}</span>
          )}
          <div className="member-carousel-overlay-copy">
            <h3>{member.name}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {detail && <p className="member-carousel-detail-copy">{detail}</p>}
      </article>
    );
  }

  const content = (
    <>
      <div className="member-carousel-portrait">
        {member.img ? (
          <img src={member.img} alt={member.name} loading="lazy" decoding="async" />
        ) : (
          <span aria-hidden="true">{initialsFor(member.name)}</span>
        )}
      </div>
      <div className="member-carousel-copy">
        <h3>{member.name}</h3>
        <p>
          {member.role}
          {member.designation && <><br />{member.designation}</>}
          {member.org && <><br />{member.org}</>}
          {member.email && <><br /><span>{member.email}</span></>}
          {member.phones && <><br />{member.phones.join(' / ')}</>}
        </p>
      </div>
    </>
  );

  return member.link ? (
    <a className={`member-carousel-card ${className}`.trim()} href={member.link} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    <article className={`member-carousel-card ${className}`.trim()}>{content}</article>
  );
};

const MemberCarousel = ({ members, title, tone = 'light', variant = '' }) => {
  const shouldLoop = members.length > 4;
  const displayMembers = shouldLoop ? [...members, ...members] : members;
  const variantClass = variant ? `member-carousel-section--${variant}` : '';
  // Every carousel (team, mentors, board) steps through at the same pace as
  // the board carousel; only the board variant gets the spotlight card treatment,
  // and only while it's actually looping/stepping.
  const isSteppedLooping = shouldLoop;
  const boardLayout = variant === 'board' && isSteppedLooping;
  const [boardIndex, setBoardIndex] = useState(0);
  const [stepWidth, setStepWidth] = useState(290);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [highlightOffset, setHighlightOffset] = useState(2);
  const trackRef = useRef(null);

  useEffect(() => {
    if (!isSteppedLooping) {
      return undefined;
    }

    const recalcStep = () => {
      if (!trackRef.current) {
        return;
      }

      const firstCard = trackRef.current.querySelector('.member-carousel-card');
      if (!firstCard) {
        return;
      }

      const style = window.getComputedStyle(firstCard);
      const marginRight = Number.parseFloat(style.marginRight) || 0;
      setStepWidth(firstCard.offsetWidth + marginRight);

      if (window.innerWidth < 768) {
        setHighlightOffset(0);
      } else {
        setHighlightOffset(1);
      }
    };

    recalcStep();
    window.addEventListener('resize', recalcStep);

    return () => {
      window.removeEventListener('resize', recalcStep);
    };
  }, [isSteppedLooping]);

  useEffect(() => {
    if (!isSteppedLooping || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const autoplayId = window.setInterval(() => {
      setTransitionEnabled(true);
      setBoardIndex((prev) => prev + 1);
    }, 3500);

    return () => {
      window.clearInterval(autoplayId);
    };
  }, [isSteppedLooping]);

  useEffect(() => {
    if (!isSteppedLooping || boardIndex < members.length) {
      return undefined;
    }

    const resetId = window.setTimeout(() => {
      setTransitionEnabled(false);
      setBoardIndex(0);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setTransitionEnabled(true);
        });
      });
    }, 900);

    return () => {
      window.clearTimeout(resetId);
    };
  }, [boardIndex, isSteppedLooping, members.length]);

  const stepTrackStyle = isSteppedLooping
    ? {
        transform: `translate3d(-${boardIndex * stepWidth}px, 0, 0)`,
        transition: transitionEnabled ? 'transform 1250ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none',
      }
    : undefined;

  const spotlightIndex = members.length > 0 ? (boardIndex + highlightOffset) % members.length : 0;

  return (
    <section className={`member-carousel-section ${tone === 'grey' ? 'member-carousel-section--grey' : ''} ${variantClass}`.trim()}>
      <div className="container">
        <header className="member-carousel-heading">
          <h2 className="section-title">{title}</h2>
        </header>
      </div>
      <div className={`member-carousel ${shouldLoop ? 'member-carousel--loop' : 'member-carousel--static'}`} tabIndex="0" aria-label={`${title} carousel`}>
        <div
          ref={trackRef}
          className={`member-carousel-track ${shouldLoop ? 'member-carousel-track--loop' : 'member-carousel-track--static'}`}
          style={stepTrackStyle}
        >
          {displayMembers.map((member, index) => (
            <MemberCard
              key={`${member.name}-${index}`}
              member={member}
              boardLayout={boardLayout}
              className={boardLayout && (index % members.length) === spotlightIndex ? 'member-carousel-card--spotlight' : ''}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MemberCarousel;
