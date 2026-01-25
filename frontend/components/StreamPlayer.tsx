import React, { useEffect, useRef, useState } from 'react';
import { FiMaximize, FiMinimize, FiVolume2, FiVolumeX, FiSettings, FiEye } from 'react-icons/fi';
import { MdLiveTv } from 'react-icons/md';
import Hls from 'hls.js';

interface StreamPlayerProps {
  streamId: string;
  lang: 'ar' | 'en';
}

const StreamPlayer: React.FC<StreamPlayerProps> = ({ streamId, lang }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [viewerCount, setViewerCount] = useState(45234);
  const [isLive, setIsLive] = useState(false);
  const hlsRef = useRef<Hls | null>(null);

  const translations = {
    ar: {
      live: 'مباشر',
      viewers: 'مشاهد',
      quality: 'الجودة',
      fullscreen: 'ملء الشاشة',
      offline: 'البث غير متاح حاليا',
    },
    en: {
      live: 'LIVE',
      viewers: 'viewers',
      quality: 'Quality',
      fullscreen: 'Fullscreen',
      offline: 'Stream is currently offline',
    }
  };

  const t = translations[lang];

  // Initialize HLS Player
  useEffect(() => {
    if (!videoRef.current || !streamId) return;

    const streamUrl = `/hls/${streamId}/index.m3u8`;

    // 1. Check if browser supports HLS natively (Safari)
    if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = streamUrl;
      videoRef.current.play().then(() => setIsLive(true)).catch(e => console.error("Native play error:", e));
    }
    // 2. Use Hls.js for other browsers (Chrome, Firefox, Edge)
    else if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLive(true);
        videoRef.current?.play().catch(e => console.error("Hls.js play error:", e));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error encountered, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error encountered, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Unrecoverable error encountered, destroying Hls instance.');
              setIsLive(false);
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [streamId]);

  useEffect(() => {
    // Simulate viewer count updates
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 100) - 50);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls) {
      timeout = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-midnight-black rounded-xl overflow-hidden group"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Player */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&q=80"
        playsInline
        muted={isMuted}
      />

      {!isLive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 flex-col gap-4">
          <div className="loader"></div>
          <p className="text-white font-bold animate-pulse">{t.offline} / Connecting...</p>
        </div>
      )}

      {/* Top Overlay - Always Visible */}
      <div className={`absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-midnight-black/80 to-transparent z-20 transition-opacity duration-300 ${!isLive ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex items-center justify-between">

          {/* Live Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-energy rounded-lg glow-emerald">
              <MdLiveTv className="text-midnight-black text-xl animate-pulse-live" />
              <span className="text-sm font-bold text-midnight-black uppercase">{t.live}</span>
            </div>

            {/* Viewer Count */}
            <div className="flex items-center gap-2 glass-panel px-4 py-2 rounded-lg">
              <FiEye className="text-emerald-energy" />
              <span className="text-white font-semibold">{viewerCount.toLocaleString()}</span>
              <span className="text-white/60 text-sm hidden sm:inline">{t.viewers}</span>
            </div>
          </div>

          {/* Quality Selector (Visual Only for now as we trust Source) */}
          <div className="glass-panel px-4 py-2 rounded-lg">
            <span className="text-emerald-energy text-xs font-bold mr-2">SOURCE</span>
            <span className="text-white font-bold">1080p60</span>
          </div>

        </div>
      </div>

      {/* Bottom Controls - Auto Hide */}
      <div className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-midnight-black/90 to-transparent 
                      transition-opacity duration-300 z-20 ${showControls && isLive ? 'opacity-100' : 'opacity-0'}`}>

        <div className="flex items-center justify-between">

          {/* Left Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleMute}
              className="w-10 h-10 md:w-12 md:h-12 rounded-lg glass-panel-subtle hover:glass-panel flex items-center justify-center 
                       transition-all hover:scale-110"
            >
              {isMuted ? <FiVolumeX className="text-xl text-white" /> : <FiVolume2 className="text-xl text-emerald-energy" />}
            </button>
          </div>

          {/* Center - Stream Progress (for VOD) */}
          <div className="flex-1 mx-8 hidden sm:block">
            {/* Empty for live streams */}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 md:w-12 md:h-12 rounded-lg glass-panel-subtle hover:glass-panel flex items-center justify-center 
                       transition-all hover:scale-110"
            >
              {isFullscreen ?
                <FiMinimize className="text-xl text-white hover:text-emerald-energy transition-colors" /> :
                <FiMaximize className="text-xl text-white hover:text-emerald-energy transition-colors" />
              }
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};

export default StreamPlayer;



