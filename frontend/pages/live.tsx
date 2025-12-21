import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Layout from '../components/Layout';
import { MdLiveTv, MdPeople, MdTimer, MdShare, MdOutlineSportsEsports, MdSettings, MdCheck, MdVolumeUp, MdVolumeOff } from 'react-icons/md';
import { BiJoystick, BiFullscreen, BiExitFullscreen } from 'react-icons/bi';

interface StreamDetails {
  title: string;
  description: string;
  is_live: boolean;
  viewer_count: number;
  banner_url?: string;
  thumbnail_url?: string;
  pre_match_details?: string;
  post_match_details?: string;
  stream_key?: string;
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
              pre_match_details: liveStream.pre_match_details,
              post_match_details: liveStream.post_match_details,
              stream_key: liveStream.stream_key
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
      fetch('/api/heartbeat', { method: 'POST' }).catch(err => console.error("Heartbeat failed", err));
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

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <Layout title={stream.title + " | Live"}>
      <div className="relative pt-24 pb-12 overflow-hidden bg-black min-h-screen">
        <div className="container mx-auto px-4 relative z-10">

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
            // Removed native controls
            />

            {/* Custom Control Bar */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 py-4 z-50 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center justify-between gap-4">

                {/* Left Controls */}
                <div className="flex items-center gap-4">
                  <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white hover:text-emerald-500 transition-colors">
                    {isPlaying ? <MdLiveTv size={28} /> : <MdLiveTv className="text-gray-400" size={28} />}
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-2 group/vol">
                    <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="text-white hover:text-emerald-500">
                      {isMuted ? <MdVolumeOff size={24} className="text-red-500" /> : <MdVolumeUp size={24} />}
                    </button>
                    {/* Volume slider could go here */}
                  </div>

                  {stream.is_live && (
                    <div className="flex items-center gap-2 text-red-500 font-bold animate-pulse">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      LIVE
                    </div>
                  )}
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-4">

                  {/* Quality Selector */}
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowQualityMenu(!showQualityMenu); }}
                      className="flex items-center gap-1 text-white hover:bg-white/10 px-2 py-1 rounded transition-colors"
                    >
                      <MdSettings size={20} />
                      <span className="text-xs font-bold">{currentQuality === -1 ? 'Auto' : qualities[currentQuality]?.height + 'p'}</span>
                    </button>

                    {/* Quality Menu Pop-up (Upwards) */}
                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-2 w-48 bg-black/90 border border-gray-700 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
                        <div className="p-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); changeQuality(-1); }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/10 flex justify-between items-center ${currentQuality === -1 ? 'text-emerald-500 bg-white/5' : 'text-white'}`}
                          >
                            <span>Auto</span>
                            {currentQuality === -1 && <MdCheck />}
                          </button>
                          {qualities.map((q, i) => (
                            <button
                              key={i}
                              onClick={(e) => { e.stopPropagation(); changeQuality(i); }}
                              className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/10 flex justify-between items-center ${currentQuality === i ? 'text-emerald-500 bg-white/5' : 'text-white'}`}
                            >
                              <span>{q.height}p</span>
                              {currentQuality === i && <MdCheck />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fullscreen Toggle */}
                  <button onClick={(e) => { e.stopPropagation(); handleFullscreen(); }} className="text-white hover:text-emerald-500 transition-colors">
                    {isFullscreen ? <BiExitFullscreen size={24} /> : <BiFullscreen size={24} title="Fullscreen" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Offline Overlay */}
            {!stream.is_live && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20 pointer-events-none">
                <div className="text-center">
                  <MdLiveTv className="text-6xl text-gray-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">Stream is Offline</h2>
                  <p className="text-gray-400">Waiting for broadcast to start...</p>
                </div>
              </div>
            )}

            {/* Top Left Overlay Info */}
            <div className="absolute top-4 left-4 z-20 flex gap-2 pointer-events-none">
              <span className="bg-black/50 backdrop-blur text-white px-3 py-1 rounded text-sm flex items-center gap-2">
                <MdPeople className="text-emerald-500" /> {stream.viewer_count.toLocaleString()}
              </span>
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
