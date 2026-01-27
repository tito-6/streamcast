import React, { useEffect, useRef, useState } from 'react';
import { FiMaximize, FiVolume2, FiVolumeX, FiSettings, FiPlay, FiPause } from 'react-icons/fi';
import { MdLiveTv } from 'react-icons/md';
import Hls from 'hls.js';
import { getImageUrl } from '../utils/image';

interface StreamPlayerProps {
  streamId: string;
  lang: 'ar' | 'en';
  poster?: string;
}

interface HlsLevel {
  height: number;
  bitrate: number;
  name?: string;
}

interface PlayerStats {
  resolution: string;
  bitrate: number;
  buffer: number;
  dropped: number;
  latency: number;
  fps: number;
}

const StreamPlayer: React.FC<StreamPlayerProps> = ({ streamId, lang, poster }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const hlsRef = useRef<Hls | null>(null);

  // Quality & Stats State
  const [levels, setLevels] = useState<HlsLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<PlayerStats>({ resolution: '-', bitrate: 0, buffer: 0, dropped: 0, latency: 0, fps: 0 });

  const translations = {
    ar: {
      live: 'مباشر',
      quality: 'الجودة',
      offline: 'البث غير متوفر حالياً',
      connecting: 'جاري الاتصال بالقناة...',
      statsTitle: 'إحصائيات العرض',
      jumpToLive: 'العودة للبث المباشر'
    },
    en: {
      live: 'LIVE',
      quality: 'Quality',
      offline: 'Stream is Offline',
      connecting: 'Connecting to stream...',
      statsTitle: 'Stats for Nerds',
      jumpToLive: 'Jump to Live'
    }
  };

  const t = translations[lang];

  useEffect(() => {
    if (!videoRef.current) return;

    const finalStreamKey = streamId;
    if (!finalStreamKey) {
      setIsOffline(true);
      setIsLoading(false);
      return;
    }
    const streamUrl = `/hls/${finalStreamKey}/master.m3u8?ts=${Date.now()}`;

    let retryTimer: NodeJS.Timeout;

    const initHls = () => {
      if (!videoRef.current) return;
      setIsLoading(true);

      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          manifestLoadingMaxRetry: 20,
          manifestLoadingRetryDelay: 2000,
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current!);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          setIsLive(true);
          setIsLoading(false);
          setIsOffline(false);
          setLevels(data.levels.map(l => ({ height: l.height, bitrate: l.bitrate, name: l.name })));
          videoRef.current?.play().catch(() => setIsPlaying(false));
        });

        hls.on(Hls.Events.FRAG_LOADED, (e, data) => {
          setStats(prev => ({
            ...prev,
            bitrate: Math.round(data.frag.stats.bwEstimate / 1000),
            latency: hls.latency
          }));
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.response?.code === 404 || data.fatal) {
            setIsOffline(true);
            setIsLoading(false);
            // Automatic Retry Loop
            clearTimeout(retryTimer);
            retryTimer = setTimeout(initHls, 5000);
          }
        });

        hlsRef.current = hls;
      }
    };

    initHls();
    return () => hlsRef.current?.destroy();
  }, [streamId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (videoRef.current) {
        const v = videoRef.current;
        setStats(prev => ({
          ...prev,
          resolution: `${v.videoWidth}x${v.videoHeight}`,
          // @ts-ignore
          dropped: v.webkitDroppedFrameCount || 0,
          buffer: v.buffered.length > 0 ? v.buffered.end(v.buffered.length - 1) - v.currentTime : 0,
          fps: 30 // Approx
        }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group shadow-2xl transition-all duration-500 border border-white/5"
      onMouseMove={() => { setShowControls(true); }}
      onMouseLeave={() => setShowControls(false)}
      onContextMenu={(e) => { e.preventDefault(); setShowStats(!showStats); }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        muted={isMuted}
        playsInline
        onClick={togglePlay}
      />

      {/* Large Center Play Icon */}
      {!isPlaying && !isLoading && !isOffline && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center animate-pulse border border-white/20">
            <FiPlay size={40} className="text-white fill-white ml-2" />
          </div>
        </div>
      )}

      {/* Offline / Loading Poster */}
      {(isOffline || isLoading) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url(${getImageUrl(poster) || 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1920'})` }}>
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-white/20 border-t-emerald-500 rounded-full animate-spin shadow-lg"></div>
              <span className="text-white text-sm font-medium tracking-widest animate-pulse">{t.connecting}</span>
            </div>
          ) : (
            <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto border border-white/10">
                <MdLiveTv size={48} className="text-white/20" />
              </div>
              <h2 className="text-3xl font-black text-white">{t.offline}</h2>
              <p className="text-white/40 text-sm">{lang === 'ar' ? 'بانتظار بدء البث القادم' : 'Waiting for next broadcast'}</p>
            </div>
          )}
        </div>
      )}

      {/* Stats for Nerds */}
      {showStats && (
        <div className="absolute top-6 left-6 z-50 bg-black/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 text-[10px] font-mono text-emerald-400 space-y-2 pointer-events-none shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-white font-bold">{t.statsTitle}</span>
          </div>
          <p>Resolution: <span className="text-white">{stats.resolution}</span></p>
          <p>Bitrate: <span className="text-white">{stats.bitrate} kbps</span></p>
          <p>Buffer: <span className="text-white">{stats.buffer.toFixed(2)}s</span></p>
          <p>Latency: <span className="text-white">{stats.latency.toFixed(2)}s</span></p>
          <p>Dropped: <span className="text-white">{stats.dropped}</span></p>
          <p>Codec: <span className="text-white">Passthrough (H.264)</span></p>
        </div>
      )}

      {/* High-End Glassmorphism Control Bar */}
      <div className={`absolute bottom-0 left-0 right-0 p-6 transition-all duration-500 flex flex-col gap-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

        {/* Timeline (Progress) - Visual Only for Live */}
        <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-red-600 w-full shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={togglePlay} className="text-white hover:text-emerald-400 transition-colors transform active:scale-90">
              {isPlaying ? <FiPause size={24} /> : <FiPlay size={24} />}
            </button>

            <button onClick={() => setIsMuted(!isMuted)} className="text-white hover:text-emerald-400 transition-colors">
              {isMuted ? <FiVolumeX size={24} /> : <FiVolume2 size={24} />}
            </button>

            {/* Premium Live Badge */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-tighter transition-all duration-500 ${stats.latency > 15 ? 'bg-white/10 text-white/40' : 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${stats.latency > 15 ? 'bg-white/20' : 'bg-white animate-pulse'}`}></div>
                {t.live}
              </div>
              {stats.latency > 15 && (
                <button
                  onClick={(e) => { e.stopPropagation(); hlsRef.current?.recoverMediaError(); }}
                  className="text-[10px] font-bold text-white/40 hover:text-white underline decoration-emerald-500"
                >{t.jumpToLive}</button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quality Menu */}
            <div className="relative">
              <button onClick={() => setShowQualityMenu(!showQualityMenu)} className={`text-white hover:text-emerald-400 transition-all ${showQualityMenu ? 'rotate-90' : ''}`}>
                <FiSettings size={22} />
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-full mb-6 right-0 w-48 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
                  <div className="p-3 bg-white/5 text-[10px] font-bold tracking-widest text-white/40 border-b border-white/5 uppercase">
                    {t.quality}
                  </div>
                  <button onClick={() => { hlsRef.current!.currentLevel = -1; setShowQualityMenu(false); }} className="w-full p-4 text-left text-xs text-white hover:bg-emerald-500 hover:text-black transition-all flex justify-between items-center group">
                    <span>Auto</span>
                    {hlsRef.current?.currentLevel === -1 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:bg-black"></div>}
                  </button>
                  {levels.map((l, i) => (
                    <button key={i} onClick={() => { hlsRef.current!.currentLevel = i; setShowQualityMenu(false); }} className="w-full p-4 text-left text-xs text-white hover:bg-emerald-500 hover:text-black transition-all flex justify-between items-center group">
                      <span>{l.height}p</span>
                      {hlsRef.current?.currentLevel === i && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:bg-black"></div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={toggleFullscreen} className="text-white hover:text-emerald-400 transition-colors">
              <FiMaximize size={22} />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .loader {
          border-right-color: transparent;
        }
        .animate-in {
          animation: 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.9); } to { transform: scale(1); } }
      `}</style>
    </div>
  );
};

export default StreamPlayer;
