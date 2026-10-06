import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { fetchBackgroundVideo } from '../../api/content';
import { APPLY_URL } from '../../data/site';

const SLIDES = ['/img/slider/slider1.jpg', '/img/slider/slider2.jpg', '/img/slider/slider3.jpg'];

const HIGHLIGHTS = [
  { icon: 'fa-university', label: 'Hosted by IIIT Kottayam' },
  { icon: 'fa-flag', label: 'AIM, NITI Aayog supported' },
  { icon: 'fa-inr', label: 'SISFS seed fund partner' },
];

// Background video is a nice-to-have: skip it for visitors who asked for less
// motion or less data, or who are on a very slow connection.
function canAutoplayBackgroundVideo() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  const connection = navigator.connection;
  if (connection?.saveData) return false;
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return false;
  return true;
}

// Plays the Mux stream behind the hero text. It starts loading only after the
// page has finished loading, is capped at 720p (it sits under a dark overlay),
// stays invisible until it is actually playing so the slide image shows
// meanwhile, and pauses while scrolled out of view.
const HeroVideo = ({ playbackId }) => {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const src = `https://stream.mux.com/${playbackId}.m3u8?max_resolution=720p`;
    let hls = null;
    let cancelled = false;

    const playNatively = () => {
      if (!video.canPlayType('application/vnd.apple.mpegurl')) return;
      video.src = src;
      video.play().catch(() => {});
    };

    // Prefer hls.js wherever Media Source Extensions exist (it adapts quality
    // to the player size); fall back to native HLS (iPhone Safari).
    const start = () => {
      if (!('MediaSource' in window || 'ManagedMediaSource' in window)) {
        playNatively();
        return;
      }
      import('hls.js/light')
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (!Hls.isSupported()) {
            playNatively();
            return;
          }
          hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 12 });
          hls.loadSource(src);
          hls.attachMedia(video);
          video.play().catch(() => {});
        })
        .catch(playNatively);
    };

    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', start);
      hls?.destroy();
    };
  }, [playbackId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      className={`home-hero__video ${playing ? 'is-playing' : ''}`}
      muted
      loop
      playsInline
      autoPlay
      preload="none"
      aria-hidden="true"
      onPlaying={() => setPlaying(true)}
    />
  );
};

const HomeSlider = () => {
  const { data: video } = useApi(fetchBackgroundVideo, null);
  const [allowVideo] = useState(canAutoplayBackgroundVideo);
  const playbackId = allowVideo ? video?.mux_playback_id : null;
  const [current, setCurrent] = useState(0);

  // Rotate slide images only when there is no background video to show.
  useEffect(() => {
    if (playbackId || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setInterval(() => setCurrent((prev) => (prev + 1) % SLIDES.length), 6000);
    return () => clearInterval(timer);
  }, [playbackId]);

  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero__media" aria-hidden="true">
        {SLIDES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`home-hero__image ${i === (playbackId ? 0 : current) ? 'is-active' : ''}`}
            fetchPriority={i === 0 ? 'high' : 'low'}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
        {playbackId && <HeroVideo playbackId={playbackId} />}
      </div>

      <div className="container home-hero__content">
        <p className="home-hero__eyebrow">
          <span className="home-hero__pulse" aria-hidden="true" />
          Atal Incubation Centre &middot; IIIT Kottayam
        </p>
        <h1 id="home-hero-title" className="home-hero__title">
          Turning bold ideas into <span>impactful startups</span>
        </h1>
        <p className="home-hero__desc">
          AIC-IIITKottayam is the incubation centre of the Indian Institute of Information Technology Kottayam,
          focused on IoT, cloud and societal technology, and supported by the AIM-NITI Aayog scheme of the
          Government of India.
        </p>
        <div className="btn-row">
          <a className="btn btn--accent" href={APPLY_URL} target="_blank" rel="noopener noreferrer">
            Apply for incubation <i className="fa fa-arrow-right" aria-hidden="true" />
          </a>
          <Link className="btn btn--ghost-light" to="/summary">
            Learn more about AIC
          </Link>
        </div>

        <ul className="home-hero__highlights">
          {HIGHLIGHTS.map((h) => (
            <li key={h.label}>
              <i className={`fa ${h.icon}`} aria-hidden="true" />
              {h.label}
            </li>
          ))}
        </ul>
      </div>

      {!playbackId && (
        <div className="home-hero__dots" role="group" aria-label="Background image">
          {SLIDES.map((src, i) => (
            <button
              key={src}
              type="button"
              className={i === current ? 'is-active' : ''}
              aria-label={`Show image ${i + 1}`}
              aria-pressed={i === current}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      )}

      <a href="#about" className="home-hero__scroll" aria-label="Scroll to content">
        <i className="fa fa-angle-down" aria-hidden="true" />
      </a>
    </section>
  );
};

export default HomeSlider;
