import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Layout from '../components/Layout';
import { MdLiveTv, MdPeople, MdTimer, MdShare, MdOutlineSportsEsports, MdSettings, MdCheck, MdVolumeUp, MdVolumeOff } from 'react-icons/md';
import { BiJoystick, BiFullscreen, BiExitFullscreen } from 'react-icons/bi';
import AdSpace from '../components/AdSpace';

interface StreamDetails {
  title: string;
  description: string;
  is_live: boolean;
  viewer_count: number;
  banner_url?: string;
  thumbnail_url?: string;
  offline_banner_url?: string;
  pre_match_details?: string;
  post_match_details?: string;
  stream_key?: string;
  language?: string;
}

const LivePage = () => {
  const [stream, setStream] = useState<StreamDetails>({
    title: "Live Championship 2024",
    description: "The biggest event of the year is live now! Watch the top teams compete for glory.",
    is_live: false,
    viewer_count: 0
  });
  const [loading, setLoading] = useState(true);

  // HLS & Player State
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);
  const [qualities, setQualities] = useState<any[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = Auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Player Controls State
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekRange, setSeekRange] = useState({ start: 0, end: 0 });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Parallel requests for Streams and Stats
        const [resStreams, resStats] = await Promise.all([
          fetch('/api/streams'),
          fetch('/api/stats')
        ]);

        const dataStreams = await resStreams.json();
        const dataStats = await resStats.json();

        // Get Real Viewer Count
        const realViewerCount = dataStats.system ? dataStats.system.viewer_count : 0;

        if (dataStreams.data && dataStreams.data.length > 0) {
          const liveStream = dataStreams.data.find((s: any) => s.is_live);
          if (liveStream) {
            setStream({
              title: liveStream.title,
              description: liveStream.description,
              is_live: liveStream.is_live,
              viewer_count: realViewerCount, // Use Real Count
              banner_url: liveStream.banner_url,
              thumbnail_url: liveStream.thumbnail_url,
              offline_banner_url: liveStream.offline_banner_url,
              pre_match_details: liveStream.pre_match_details,
              post_match_details: liveStream.post_match_details,
              stream_key: liveStream.stream_key,
              language: liveStream.language
            });
          } else {
            const s = dataStreams.data[0];
            setStream({
              title: s.title,
              description: s.description,
              is_live: false,
              viewer_count: 0,
              banner_url: s.banner_url,
              thumbnail_url: s.thumbnail_url,
              offline_banner_url: s.offline_banner_url,
              pre_match_details: s.pre_match_details,
              post_match_details: s.post_match_details
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch stream details", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  // Heartbeat Loop (Tell backend "I am watching")
  useEffect(() => {
    if (!stream.is_live) return;

    const sendHeartbeat = () => {
      const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
      fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: stream.language || 'en', // using stream language as proxy or default
          device_type: deviceType
        })
      }).catch(err => console.error("Heartbeat failed", err));
    };

    // Send immediately then every 10s
    sendHeartbeat();
    const hbInterval = setInterval(sendHeartbeat, 10000);
    return () => clearInterval(hbInterval);
  }, [stream.is_live]);

  // HLS.js Setup
  useEffect(() => {
    let hls: any = null;

    const initPlayer = async () => {
      if (!stream.is_live && !hlsRef.current) return;

      // @ts-ignore
      const Hls = (await import('hls.js')).default;

      if (Hls.isSupported() && videoRef.current) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        hls = new Hls({
          capLevelToPlayerSize: true,
          autoStartLoad: true,
        });

        const streamUrl = `/hls/test/master.m3u8`;

        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, (event: any, data: any) => {
          console.log("Manifest parsed, found " + data.levels.length + " quality levels");
          setQualities(data.levels);
          videoRef.current?.play().catch(() => console.log("Autoplay blocked"));
          setIsPlaying(true);
        });

        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("Network error, trying to recover...");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("Media error, trying to recover...");
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (videoRef.current && videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = '/hls/test/master.m3u8';
        videoRef.current.addEventListener('loadedmetadata', () => {
          videoRef.current?.play();
          setIsPlaying(true);
        });
      }
    };

    if (stream.is_live) {
      initPlayer();
    } else {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [stream.is_live]);

  // Sync fullscreen state listener
  useEffect(() => {
    const handleFCChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFCChange);
    return () => document.removeEventListener('fullscreenchange', handleFCChange);
  }, []);

  const changeQuality = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentQuality(index);
      setShowQualityMenu(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: stream.title,
          text: stream.description,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Stream link copied to clipboard!");
      }
    } catch (error) {
      console.log("Error sharing:", error);
    }
  };

  // Player Handlers
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => {
      if (!showQualityMenu && isPlaying) setShowControls(false);
    }, 3000);
    setControlsTimeout(timeout);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
      if (videoRef.current.muted) setVolume(0);
      else setVolume(1);
    }
  };

  const handleFullscreen = async () => {
    // iOS Safari Handling
    if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
      (videoRef.current as any).webkitEnterFullscreen();
      return;
    }

    // Standard Fullscreen API
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          (containerRef.current as any).webkitRequestFullscreen(); // Older Chromium/Android
        }

        // @ts-ignore
        if (screen.orientation && screen.orientation.lock) {
          // @ts-ignore
          await screen.orientation.lock('landscape').catch(e => console.log('Orientation lock failed:', e));
        }
      } catch (err: any) {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  return (
    <Layout title={stream.title + " | Live"}>
      <div className="relative pt-24 pb-12 overflow-hidden bg-black min-h-screen">
        <div className="container mx-auto px-4 relative z-10">

          {/* Ad Space - Top */}
          <AdSpace reference="live_top" className="container mx-auto max-w-4xl" />

          {/* Video Player Container */}
          <div
            ref={containerRef}
            className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 mb-8 group"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
          >
            {/* Click to Toggle Play */}
            <div className="absolute inset-0 z-10" onClick={togglePlay}></div>

            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                  if (videoRef.current.seekable.length > 0) {
                    const start = videoRef.current.seekable.start(0);
                    const end = videoRef.current.seekable.end(videoRef.current.seekable.length - 1);
                    setSeekRange({ start, end });
                  }
                }
              }}
            // Removed native controls
            />

            {/* Mind-Blowing Modern Control Bar */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-12 pb-4 px-6 z-50 transition-all duration-300 ease-out ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

              {/* Progress/Seek Bar */}
              <div className="relative mb-6 group/seek h-1 hover:h-2 transition-all duration-200 cursor-pointer">
                {/* Background Track */}
                <div className="absolute inset-0 bg-white/20 rounded-full backdrop-blur-sm"></div>
                {/* Buffered Track (Simulated) */}
                <div className="absolute top-0 left-0 h-full bg-white/30 rounded-full w-3/4"></div>
                {/* Playhead Track */}
                <div
                  className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full relative"
                  style={{ width: `${(currentTime / (seekRange.end || 1)) * 100}%` }}
                >
                  {/* Glowing Knob */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] scale-0 group-hover/seek:scale-110 transition-transform"></div>
                </div>

                {/* Input Layer */}
                <input
                  type="range"
                  min={seekRange.start}
                  max={seekRange.end || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (videoRef.current) videoRef.current.currentTime = val;
                    setCurrentTime(val);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">

                {/* Left Controls (Play & Volume) */}
                <div className="flex items-center gap-6">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    className="group hover:bg-white/10 p-2 rounded-full transition-all"
                  >
                    {isPlaying ? (
                      <MdLiveTv size={32} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    ) : (
                      <div className="relative">
                        <MdLiveTv size={32} className="text-white/80 group-hover:text-white" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-1"></div>
                        </div>
                      </div>
                    )}
                  </button>

                  {/* Volume Slider Group */}
                  <div className="flex items-center gap-2 group/vol">
                    <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="hover:text-emerald-400 text-white transition-colors">
                      {isMuted ? <MdVolumeOff size={24} className="text-red-500" /> : <MdVolumeUp size={24} />}
                    </button>
                    <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300 ease-out flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setVolume(val);
                          if (videoRef.current) videoRef.current.volume = val;
                          setIsMuted(val === 0);
                        }}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* LIVE Indicator */}
                  {stream.is_live && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full backdrop-blur-md">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                      <span className="w-2 h-2 bg-red-500 rounded-full absolute"></span>
                      <span className="text-xs font-black text-red-500 tracking-wider">LIVE</span>
                    </div>
                  )}

                  {/* Viewers (Mock or Real) */}
                  <div className="hidden md:flex items-center gap-2 text-gray-400 text-xs font-medium">
                    <MdPeople size={16} />
                    <span>{stream.viewer_count > 0 ? (stream.viewer_count / 1000).toFixed(1) + 'k' : 'Watching'}</span>
                  </div>
                </div>

                {/* Right Controls (Quality & Settings) */}
                <div className="flex items-center gap-2">

                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowQualityMenu(!showQualityMenu); }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 backdrop-blur-md transition-all group"
                    >
                      <MdSettings size={18} className="text-gray-300 group-hover:rotate-90 transition-transform duration-500" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {currentQuality === -1 ? 'Auto' : (qualities[currentQuality]?.height || '1080') + 'p'}
                      </span>
                    </button>

                    {/* Pro Quality Menu */}
                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-3 w-56 bg-black/90 border border-emerald-500/30 rounded-xl overflow-hidden backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-slide-up">
                        <div className="px-3 py-2 bg-white/5 border-b border-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Video Quality
                        </div>
                        <div className="p-1 space-y-0.5">
                          {/* Force Mock Qualities if empty for Demo */}
                          {(!qualities || qualities.length === 0) && [1080, 720, 480, 360].map((h, i) => (
                            <button
                              key={`mock-${h}`}
                              onClick={(e) => { e.stopPropagation(); setShowQualityMenu(false); alert("Quality Switch Simulated: " + h + "p"); }}
                              className="w-full text-left px-3 py-2.5 text-xs rounded-lg hover:bg-emerald-500/20 hover:text-emerald-400 flex justify-between items-center text-gray-300 transition-colors group"
                            >
                              <span className="font-medium flex items-center gap-2">
                                {h >= 1080 && <span className="px-1 py-0.5 bg-emerald-500/20 rounded text-[9px] text-emerald-400">HD</span>}
                                {h}p
                              </span>
                            </button>
                          ))}

                          {/* Real Qualities if valid */}
                          <button
                            onClick={(e) => { e.stopPropagation(); changeQuality(-1); }}
                            className={`w-full text-left px-3 py-2.5 text-xs rounded-lg hover:bg-emerald-500/20 flex justify-between items-center transition-colors ${currentQuality === -1 ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-300'}`}
                          >
                            <span className="font-bold">Auto (Recommended)</span>
                            {currentQuality === -1 && <MdCheck size={14} />}
                          </button>

                          {qualities.map((q, i) => (
                            <button
                              key={i}
                              onClick={(e) => { e.stopPropagation(); changeQuality(i); }}
                              className={`w-full text-left px-3 py-2.5 text-xs rounded-lg hover:bg-emerald-500/20 flex justify-between items-center transition-colors ${currentQuality === i ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-300'}`}
                            >
                              <span className="flex items-center gap-2">
                                {q.height >= 720 && <span className="text-[9px] px-1 bg-white/10 rounded font-bold text-gray-400">HD</span>}
                                {q.height}p
                              </span>
                              {currentQuality === i && <MdCheck size={14} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleFullscreen(); }}
                    className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
                    title="Fullscreen"
                  >
                    {isFullscreen ? <BiExitFullscreen size={22} /> : <BiFullscreen size={22} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Offline Overlay */}
            {!stream.is_live && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20 pointer-events-none overflow-hidden">
                {stream.offline_banner_url ? (
                  <img src={stream.offline_banner_url} alt="Offline" className="w-full h-full object-cover opacity-70" />
                ) : (
                  <div className="text-center">
                    <MdLiveTv className="text-6xl text-gray-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Stream is Offline</h2>
                    <p className="text-gray-400">Waiting for broadcast to start...</p>
                  </div>
                )}
              </div>
            )}

            {/* Top Left Overlay Info (Viewer Count Removed) */}
            <div className="absolute top-4 left-4 z-20 flex gap-2 pointer-events-none">
              {/* Removed as per request */}
            </div>

          </div>

          {/* Details */}
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{stream.title}</h1>
                <p className="text-gray-400">{stream.description}</p>
              </div>

              <div className="bg-midnight-black p-6 rounded-2xl border border-gray-800">
                <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-800 pb-2">Event Details</h3>
                <div className="space-y-4">
                  {stream.pre_match_details && (
                    <div>
                      <h4 className="text-emerald-energy font-bold text-sm uppercase mb-1">Pre-Match</h4>
                      <p className="text-gray-300 whitespace-pre-line">{stream.pre_match_details}</p>
                    </div>
                  )}
                  {stream.post_match_details && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <h4 className="text-blue-400 font-bold text-sm uppercase mb-1">Post-Match Analysis</h4>
                      <p className="text-gray-300 whitespace-pre-line">{stream.post_match_details}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:w-80 space-y-4">
              <AdSpace reference="live_sidebar" />
              <button
                onClick={handleShare}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
              >
                <MdShare size={20} /> Share Stream
              </button>
              <div className="h-[400px] bg-midnight-black rounded-2xl border border-gray-800 flex flex-col">
                <div className="p-4 border-b border-gray-800 font-bold text-white">Live Chat</div>
                <div className="flex-1 p-4 flex items-center justify-center text-gray-500 text-sm">
                  Chat is disabled.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LivePage;
