import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import { fetchBackgroundVideo } from '../../api/content';

const slides = [
  {
    image: '/img/slider/slider1.jpg',
    direction: 'slider-one',
    title1: 'AIC-IIITKOTTAYAM',
    title2: 'An Incubation Centre',
    description: 'of the Indian Institute of Information Technology Kottayam (IIITKottayam) on IoT Cloud Societal projects.\nAcknowledges: AIM-NITI scheme of Government of India.',
    align: 'left'
  },
  {
    image: '/img/slider/slider2.jpg',
    direction: 'slider-two',
    title1: 'AIC-IIITKOTTAYAM',
    title2: 'An Incubation Centre',
    description: 'of the Indian Institute of Information Technology Kottayam (IIITKottayam) on IoT Cloud Societal projects.\nAcknowledges: AIM-NITI scheme of Government of India.',
    align: 'center'
  },
  {
    image: '/img/slider/slider3.jpg',
    direction: 'slider-two',
    title1: 'AIC-IIITKOTTAYAM',
    title2: 'An Incubation Centre',
    description: 'of the Indian Institute of Information Technology Kottayam (IIITKottayam) on IoT Cloud Societal projects.\nAcknowledges: AIM-NITI scheme of Government of India.',
    align: 'left'
  }
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
      className="home-hero-video"
      muted
      loop
      playsInline
      autoPlay
      preload="none"
      aria-hidden="true"
      onPlaying={() => setPlaying(true)}
      style={{ position: 'absolute', inset: 0, opacity: playing ? 1 : 0 }}
    />
  );
};

const HomeSlider = () => {
  const { data: video } = useApi(fetchBackgroundVideo, null);
  const [allowVideo] = useState(canAutoplayBackgroundVideo);
  const playbackId = allowVideo ? video?.mux_playback_id : null;

  const [currentSlide, setCurrentSlide] = useState(0);
  const isAutoScrolling = useRef(false);
  const scrollIntentDelta = useRef(0);
  const resetDeltaTimer = useRef(null);

  // Rotate slide images only when there is no background video to show.
  useEffect(() => {
    if (playbackId) return undefined;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [playbackId]);

  useEffect(() => {
    const handleWheel = (event) => {
      if (event.deltaY <= 0 || isAutoScrolling.current) {
        return;
      }

      const hero = document.querySelector('.home-hero');
      const aboutSection = document.getElementById('about');

      if (!hero || !aboutSection) {
        return;
      }

      const heroRect = hero.getBoundingClientRect();
      const heroDominantView = heroRect.top <= 0 && heroRect.bottom > window.innerHeight * 0.55;

      if (!heroDominantView) {
        scrollIntentDelta.current = 0;
        return;
      }

      scrollIntentDelta.current += event.deltaY;

      if (resetDeltaTimer.current) {
        window.clearTimeout(resetDeltaTimer.current);
      }

      resetDeltaTimer.current = window.setTimeout(() => {
        scrollIntentDelta.current = 0;
      }, 180);

      if (scrollIntentDelta.current < 170) {
        return;
      }

      event.preventDefault();
      isAutoScrolling.current = true;
      scrollIntentDelta.current = 0;

      const nav = document.getElementById('nav');
      const navOffset = nav ? nav.offsetHeight + 14 : 90;
      const targetTop = aboutSection.getBoundingClientRect().top + window.scrollY - navOffset;

      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: 'smooth',
      });

      window.setTimeout(() => {
        isAutoScrolling.current = false;
      }, 1000);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      if (resetDeltaTimer.current) {
        window.clearTimeout(resetDeltaTimer.current);
      }
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const slide = slides[playbackId ? 0 : currentSlide];

  return (
    <div id="home" className="slider-area home-hero">
      <div className="home wrapper home-hero-wrapper">
        <div className="bend niceties preview-2">
          <div id="ensign-nivoslider" className="slides home-hero-media">
            <img
              src={slide.image}
              alt="Slide"
              className="home-hero-image"
              fetchPriority="high"
            />
            {playbackId && <HeroVideo playbackId={playbackId} />}
          </div>

          <div className={`slider-direction ${slide.direction} home-hero-overlay`}>
            <div className="container">
              <div className="row">
                <div className="col-md-12 col-sm-12 col-xs-12">
                  <div className="slider-content home-hero-content text-center">
                    <div className="layer-1-1">
                      <h2 className="title1 home-hero-title1">{slide.title1}</h2>
                    </div>
                    <div className="layer-1-2">
                      <h1 className="title2 home-hero-title2">{slide.title2}</h1>
                      <p className="home-hero-description">
                        {slide.description}
                      </p>
                    </div>
                    <div className="layer-1-3 home-hero-actions">
                      <a className="ready-btn right-btn page-scroll" href="https://forms.gle/2c4NgmXp4B16zGet6" target="_blank" rel="noopener noreferrer">
                        Apply for Incubation
                      </a>
                      <Link className="ready-btn page-scroll" to="/summary">
                        Learn More
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slider controls */}
          {!playbackId && (
            <div className="home-hero-dots">
              {slides.map((_, idx) => (
                <span
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`home-hero-dot ${currentSlide === idx ? 'active' : ''}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeSlider;
