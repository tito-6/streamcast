import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MdLiveTv } from 'react-icons/md';
import { FiEye, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getImageUrl } from '../utils/image';

interface Stream {
  id: number;
  title: string;
  is_live: boolean;
  stream_key: string;
  category: string;
  thumbnail_url: string;
  banner_url: string;
  viewer_count?: number;
}

interface LiveStreamsSectionProps {
  lang: 'ar' | 'en';
}

const LiveStreamsSection: React.FC<LiveStreamsSectionProps> = ({ lang }) => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);

  const translations = {
    ar: {
      liveNow: 'مباشر الآن',
      viewers: 'مشاهد',
      seeAll: 'عرض الكل',
      topStreams: 'المباريات المباشرة',
      offline: 'غير متصل',
    },
    en: {
      liveNow: 'Live Now',
      viewers: 'viewers',
      seeAll: 'See All',
      topStreams: 'Live Matches',
      offline: 'Offline',
    }
  };

  const t = translations[lang];

  useEffect(() => {
    const fetchRealStreams = async () => {
      try {
        const response = await fetch('/api/streams');
        const data = await response.json();

        if (data.data) {
          // Filter only live or special featured streams
          setStreams(data.data.slice(0, 8));
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealStreams();
    const interval = setInterval(fetchRealStreams, 30000);
    return () => clearInterval(interval);
  }, []);

  const scrollContainer = (direction: 'left' | 'right') => {
    const container = document.getElementById('streams-container');
    if (container) {
      const scrollAmount = direction === 'right' ? 400 : -400;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading && streams.length === 0) return null;
  if (streams.length === 0) return null;

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">

        {/* Section Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-emerald-500 rounded-full" />
            <h2 className="text-3xl font-bold text-white tracking-tight">{t.topStreams}</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-500 font-bold uppercase tracking-wider">{t.liveNow}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/sports" className="text-emerald-400 hover:text-white transition-colors font-bold text-sm tracking-widest uppercase">
              {t.seeAll} →
            </Link>

            {/* Scroll Buttons */}
            <div className="hidden md:flex gap-2 ml-4">
              <button
                onClick={() => scrollContainer('left')}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/50 
                         flex items-center justify-center transition-all hover:bg-emerald-500/10 text-white"
              >
                {lang === 'ar' ? <FiChevronRight /> : <FiChevronLeft />}
              </button>
              <button
                onClick={() => scrollContainer('right')}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/50 
                         flex items-center justify-center transition-all hover:bg-emerald-500/10 text-white"
              >
                {lang === 'ar' ? <FiChevronLeft /> : <FiChevronRight />}
              </button>
            </div>
          </div>
        </div>

        {/* Streams Container */}
        <div
          id="streams-container"
          className="flex gap-6 overflow-x-auto hide-scrollbar pb-8 pt-2"
          style={{ scrollBehavior: 'smooth' }}
        >
          {streams.map((stream) => (
            <Link href={`/live?s=${stream.stream_key}`} key={stream.id} className="flex-shrink-0 group">
              <div className="w-80 relative">
                {/* Thumbnail Container */}
                <div className="aspect-video rounded-2xl overflow-hidden bg-gray-900 border border-white/5 relative shadow-2xl">
                  {/* Badge */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 text-black rounded-lg shadow-lg">
                    <MdLiveTv size={14} />
                    <span className="text-[10px] font-black uppercase">{stream.is_live ? t.liveNow : t.offline}</span>
                  </div>

                  {/* Image */}
                  <img
                    src={getImageUrl(stream.thumbnail_url || stream.banner_url)}
                    alt={stream.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800';
                    }}
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                </div>

                {/* Content */}
                <div className="mt-4 px-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors truncate text-lg">
                        {stream.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">{stream.category || 'FOOTBALL'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      </div>
    </section>
  );
};

export default LiveStreamsSection;
