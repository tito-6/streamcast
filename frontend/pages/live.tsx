import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { MdShare } from 'react-icons/md';
import AdSpace from '../components/AdSpace';
import StreamPlayer from '../components/StreamPlayer';

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
    viewer_count: 0,
    stream_key: 'live_42a01020-3041-420b-b180-4f7ced842dc4' // Default to user key
  });
  const [loading, setLoading] = useState(true);

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
          const liveStream = dataStreams.data.find((s: any) => s.is_live) || dataStreams.data[0];

          if (liveStream) {
            setStream({
              title: liveStream.title,
              description: liveStream.description,
              is_live: liveStream.is_live,
              viewer_count: realViewerCount,
              banner_url: liveStream.banner_url,
              thumbnail_url: liveStream.thumbnail_url,
              offline_banner_url: liveStream.offline_banner_url,
              pre_match_details: liveStream.pre_match_details,
              post_match_details: liveStream.post_match_details,
              stream_key: 'live_42a01020-3041-420b-b180-4f7ced842dc4', // User provided key
              language: liveStream.language
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
          language: stream.language || 'en',
          device_type: deviceType
        })
      }).catch(err => console.error("Heartbeat failed", err));
    };

    // Send immediately then every 10s
    sendHeartbeat();
    const hbInterval = setInterval(sendHeartbeat, 10000);
    return () => clearInterval(hbInterval);
  }, [stream.is_live]);

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

  return (
    <Layout title={stream.title + " | Live"}>
      <div className="relative pt-24 pb-12 overflow-hidden bg-black min-h-screen">
        <div className="container mx-auto px-4 relative z-10">

          {/* Ad Space - Top */}
          <AdSpace reference="live_top" className="container mx-auto max-w-4xl" />

          {/* Video Player Container */}
          <div className="mb-8">
            <StreamPlayer streamId={stream.stream_key || 'test'} lang="ar" />
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
                  {!stream.pre_match_details && !stream.post_match_details && (
                    <p className="text-gray-500 italic">No additional details available for this event.</p>
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
