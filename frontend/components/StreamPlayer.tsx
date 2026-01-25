import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FiMaximize, FiMinimize, FiVolume2, FiVolumeX, FiSettings, FiPlay, FiPause } from 'react-icons/fi';
import { MdLiveTv, MdCheck } from 'react-icons/md';
import Hls from 'hls.js';

interface StreamPlayerProps {
  streamId: string;
  lang: 'ar' | 'en';
}

interface HlsLevel {
  height: number;
  bitrate: number;
  name?: string;
}

const StreamPlayer: React.FC<StreamPlayerProps> = ({ streamId, lang }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hlsRef = useRef<Hls | null>(null);

  // Quality State
  const [levels, setLevels] = useState<HlsLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = Auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const translations = {
    ar: {
      live: 'مباشر',
      quality: 'الجودة',
      fullscreen: 'ملء الشاشة',
      offline: 'البث غير متاح حاليا / جاري الاتصال...',
      auto: 'تلقائي',
      source: 'المصدر'
    },
    en: {
      live: 'LIVE',
      quality: 'Quality',
      fullscreen: 'Fullscreen',
      offline: 'Connecting / Stream Offline...',
      auto: 'Auto',
      source: 'Source'
    }
  };

  const t = translations[lang];

  // Initialize HLS Player with Low Latency Config
  useEffect(() => {
    if (!videoRef.current || !streamId) return;

    // Use user-provided key if needed, or dynamic id. 
    // Fallback to the known working key if just "test" is passed, for safety.
    const finalStreamKey = streamId === 'test' ? 'live_42a01020-3041-420b-b180-4f7ced842dc4' : streamId;
    const streamUrl = `/hls/${finalStreamKey}/index.m3u8`;

    const initHls = () => {
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          // Aggressive catch-up logic to minimize lag
          liveSyncDurationCount: 3, // Stay 3 segments behind live edge (safe)
          liveMaxLatencyDurationCount: 10, // Max allowed latency before jumping
          maxLiveSyncPlaybackRate: 1.5, // Speed up to 1.5x to catch up if lagging
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current!);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          setIsLive(true);
          setIsLoading(false);
          // Populate Quality Levels
          const mappedLevels = data.levels.map((l: any) => ({
            height: l.height,
            bitrate: l.bitrate,
            name: l.name
          }));
          setLevels(mappedLevels);

          videoRef.current?.play().catch(e => console.error("Autoplay blocked:", e));
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          // Update UI when Auto switches level
          if (hls.autoLevelEnabled) {
            // We could track "Auto (1080p)" here if we want
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('Network error, trying to recover...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Media error, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                setIsLive(false); // Only set offline on fatal unrecoverable
                hls.destroy();
                break;
            }
          }
        });

        hlsRef.current = hls;
      }
      // Safari Native HLS Support
      else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = streamUrl;
        videoRef.current.addEventListener('loadedmetadata', () => {
          setIsLive(true);
          setIsLoading(false);
          videoRef.current?.play();
        });
      }
    };

    initHls();

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [streamId]);

  // Sync fullscreen state
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(e => console.error(e));
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(e => console.error(e));
    }
  }, []);

  // Click Video Handler (Toggle Play / Fullscreen on Double Click? No, user asked valid click)
  // User asked: "let the full screen mode whenever clicking on teh video"
  const handleVideoClick = (e: React.MouseEvent) => {
    // Prevent double triggering if clicking controls
    if ((e.target as HTMLElement).closest('button')) return;

    // Toggle Fullscreen on click (User Request)
    toggleFullscreen();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const newMute = !isMuted;
      videoRef.current.muted = newMute;
      setIsMuted(newMute);
      if (newMute) setVolume(0);
      else setVolume(1);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const changeLevel = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentLevel(levelIndex);
      setShowQualityMenu(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-xl overflow-hidden group select-none ${isFullscreen ? 'w-full h-full' : 'aspect-video shadow-2xl'}`}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={handleVideoClick}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        poster="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&q=80"
        playsInline
        muted={isMuted}
      />

      {/* Offline / Loading Overlay */}
      {(!isLive || isLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 flex-col gap-4">
          <div className="loader w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white font-bold animate-pulse tracking-widest text-sm md:text-base">
            {isLoading ? 'CONNECTING...' : t.offline}
          </p>
        </div>
      )}

      {/* Top Overlay: Live Status */}
      <div className={`absolute top-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-b from-black/80 to-transparent z-30 transition-opacity duration-300 ${isLive ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <MdLiveTv className="text-white text-lg animate-pulse" />
            <span className="text-xs font-black text-white uppercase tracking-widest">{t.live}</span>
          </div>
          {/* Viewers Count REMOVED as requested */}
          {/* Quality Badge (Indicator) */}
          <div className="ml-auto glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
            <span className="text-white text-xs font-bold font-mono">
              {currentLevel === -1 ? (levels.length > 0 ? 'AUTO' : 'SOURCE') : levels[currentLevel]?.height + 'p'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className={`absolute bottom-0 left-0 right-0 px-4 pb-4 pt-16 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-30 transition-all duration-300 ${showControls && isLive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

        <div className="flex items-center justify-between gap-4" onClick={(e) => e.stopPropagation()}>

          {/* Left: Play/Pause & Volume */}
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); if (isPlaying) videoRef.current?.pause(); else videoRef.current?.play(); }}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-all transform hover:scale-110 active:scale-95"
            >
              {isPlaying ? <FiPause size={24} fill="currentColor" /> : <FiPlay size={24} fill="currentColor" />}
            </button>

            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-emerald-400 transition-colors">
                {isMuted || volume === 0 ? <FiVolumeX size={24} /> : <FiVolume2 size={24} />}
              </button>
              <div className="w-0 overflow-hidden group-hover/volume:w-20 md:group-hover/volume:w-28 transition-all duration-300 flex items-center">
                <input
                  type="range" min="0" max="1" step="0.05" value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Right: Quality & Fullscreen */}
          <div className="flex items-center gap-2 md:gap-4">

            {/* Quality Selector */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowQualityMenu(!showQualityMenu); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"
              >
                <FiSettings size={20} className={`transition-transform duration-500 ${showQualityMenu ? 'rotate-90 text-emerald-400' : ''}`} />
              </button>

              {/* Quality Menu Pop-up */}
              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-4 w-48 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-fade-in-up">
                  <div className="px-4 py-3 border-b border-white/10 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.quality}</div>

                  <div className="max-h-60 overflow-y-auto">
                    <button
                      onClick={() => changeLevel(-1)}
                      className={`w-full text-left px-4 py-3 text-xs font-bold flex items-center justify-between hover:bg-emerald-500/10 transition-colors ${currentLevel === -1 ? 'text-emerald-400' : 'text-gray-300'}`}
                    >
                      <span>{t.auto}</span>
                      {currentLevel === -1 && <MdCheck size={16} />}
                    </button>

                    {levels.length > 0 ? levels.map((lvl, idx) => (
                      <button
                        key={idx}
                        onClick={() => changeLevel(idx)}
                        className={`w-full text-left px-4 py-3 text-xs font-bold flex items-center justify-between hover:bg-emerald-500/10 transition-colors ${currentLevel === idx ? 'text-emerald-400' : 'text-gray-300'}`}
                      >
                        <span>{lvl.height}p</span>
                        {currentLevel === idx && <MdCheck size={16} />}
                      </button>
                    )) : (
                      /* Fallback if no levels detected usually means only Source is available */
                      <div className="px-4 py-3 text-xs text-gray-500 italic text-center">Source (1080p)</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-all transform hover:scale-110 active:scale-95"
            >
              {isFullscreen ? <FiMinimize size={24} /> : <FiMaximize size={24} />}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StreamPlayer;
