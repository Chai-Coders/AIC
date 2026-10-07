import React, { useState, useEffect, useRef } from 'react';
import useApi from '../../hooks/useApi';
import { fetchBackgroundVideo } from '../../api/content';
import { APPLY_URL } from '../../data/site';

// Each slide has a full-size and a phone-size copy (see public/img/site).
const SLIDES = [
  { name: 'campus', width: 1500, caption: 'IIIT Kottayam campus, Valavoor' },
  { name: 'hero-1', width: 2000, caption: 'The incubation floor at AIC' },
  { name: 'pitch', width: 2000, caption: 'A startup review session' },
];

const STATS = [
  { value: '₹50L', label: 'Seed funding per startup, via SISFS' },
  { value: '42', label: 'Startups supported' },
  { value: '141', label: 'Jobs created' },
  { value: '11', label: 'IPs generated' },
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
  const shown = playbackId ? 0 : current;

  // Rotate slide images only when there is no background video to show. The
  // timer restarts on every change, so a clicked slide also gets its full time
  // (the progress dash under the active dot runs for the same 7s).
  useEffect(() => {
    if (playbackId || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setTimeout(() => setCurrent((prev) => (prev + 1) % SLIDES.length), 7000);
    return () => clearTimeout(timer);
  }, [playbackId, current]);

  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero__media" aria-hidden="true">
        {SLIDES.map((slide, i) => (
          <img
            key={slide.name}
            src={`/img/site/${slide.name}.jpg`}
            srcSet={`/img/site/${slide.name}-1000.jpg 1000w, /img/site/${slide.name}.jpg ${slide.width}w`}
            sizes="100vw"
            alt=""
            className={`home-hero__image ${i === shown ? 'is-active' : ''}`}
            fetchPriority={i === 0 ? 'high' : 'low'}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
        {playbackId && <HeroVideo playbackId={playbackId} />}
      </div>

      <div className="container home-hero__content">
        <p className="home-hero__eyebrow">Atal Incubation Centre &middot; IIIT Kottayam</p>
        <h1 id="home-hero-title" className="home-hero__title">
          From first prototype to a <em>funded company.</em>
        </h1>
        <p className="home-hero__desc">
          We back early-stage founders in IoT, cloud, AI and societal technology with mentors, labs and seed
          capital, from inside an Institute of National Importance.
        </p>
        <div className="btn-row">
          <a className="btn btn--accent" href={APPLY_URL} target="_blank" rel="noopener noreferrer">
            Apply for incubation <i className="fa fa-arrow-right" aria-hidden="true" />
          </a>
          <a className="btn btn--ghost-light" href="#programmes">
            Explore programmes
          </a>
        </div>

        {!playbackId && (
          <div className="home-hero__slides">
            <div className="home-hero__dots" role="group" aria-label="Background image">
              {SLIDES.map((slide, i) => (
                <button
                  key={slide.name}
                  type="button"
                  className={i === current ? 'is-active' : ''}
                  aria-label={`Show image ${i + 1}: ${slide.caption}`}
                  aria-pressed={i === current}
                  onClick={() => setCurrent(i)}
                />
              ))}
            </div>
            <p className="home-hero__caption" aria-hidden="true">{SLIDES[current].caption}</p>
          </div>
        )}
      </div>

      <div className="home-hero__facts">
        <dl className="container home-hero__stats">
          {STATS.map((stat, i) => (
            <div key={stat.label} className="home-hero__stat" style={{ '--i': i }}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};

export default HomeSlider;
