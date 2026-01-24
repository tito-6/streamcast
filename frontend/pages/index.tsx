import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import HeroSection from '../components/HeroSection';
import { getStreamStatus, StreamStatus } from '../lib/api';
import { MdLiveTv, MdArticle } from 'react-icons/md';
import Link from 'next/link';
import AdSpace from '../components/AdSpace';

interface Post {
  id: number;
  title_ar: string;
  title_en: string;
  title_tr: string;
  content_ar: string;
  content_en: string;
  content_tr: string;
  image_url: string;
  category: string;
  created_at: string;
}

import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';
import { format } from 'date-fns';
import { ar, enUS, tr } from 'date-fns/locale';

export default function HomePage() {
  const { language } = useLanguage();
  const t = translations[language];
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [archives, setArchives] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (posts.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % posts.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [posts.length]);

  useEffect(() => {
    async function fetchData() {
      const statusData = await getStreamStatus();
      setStatus(statusData);

      // Fetch posts
      try {
        const res = await fetch('/api/posts');
        const json = await res.json();
        if (json.data) setPosts(json.data.slice(0, 3));
      } catch (err) { console.error(err); }

      // Fetch archives
      try {
        const res = await fetch('/api/archives');
        const json = await res.json();
        if (json.data) setArchives(json.data.slice(0, 4));
      } catch (err) { console.error(err); }
    }
    fetchData();
  }, []);

  const getImageUrl = (url: string) => {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http') && !url.includes('localhost')) return url;
    if (url.includes('localhost')) {
      return url.replace('http://localhost:8080/uploads', '/uploads');
    }
    return `/uploads/${url}`;
  };

  return (
    <Layout lang={language}>
      {/* Hero Section */}
      <HeroSection lang={language} />

      {/* Ad Space - Top */}
      <div className="container mx-auto px-4 lg:px-8 mt-8">
        <AdSpace reference="home_top" />
      </div>

      {/* Live Now Banner (if online) */}
      {status?.online && (
        <div className="container mx-auto px-4 lg:px-8 -mt-10 relative z-10">
          <Link href="/live">
            <div className="bg-gradient-oasis p-1 rounded-2xl shadow-glow-emerald cursor-pointer hover:scale-[1.02] transition-transform">
              <div className="bg-midnight-black rounded-xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-energy rounded-full flex items-center justify-center animate-pulse-live">
                    <MdLiveTv className="text-midnight-black text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {status.streamTitle || (language === 'ar' ? 'بث مباشر الآن' : 'Live Stream Now')}
                    </h3>
                    <p className="text-emerald-energy font-semibold">
                      {status.viewerCount} {language === 'ar' ? 'مشاهد' : 'viewers'}
                    </p>
                  </div>
                </div>
                <div className="hidden md:block">
                  <span className="btn-primary">
                    {language === 'ar' ? 'شاهد الآن' : 'Watch Now'}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      <div className="container mx-auto px-4 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Main Content Area (3 Cols) */}
          <div className="lg:col-span-3 space-y-16">

            {/* Archives / Past Streams */}
            {archives.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <MdLiveTv className="text-3xl text-emerald-energy" />
                  <h2 className="text-3xl font-bold text-white">
                    {language === 'ar' ? 'أرشيف البث' : 'Recorded Streams'}
                  </h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {archives.map((arch) => (
                    <a key={arch.id} href={arch.file_path} target="_blank" rel="noopener noreferrer" className="glass-panel group rounded-xl overflow-hidden hover:border-emerald-energy transition-all block">
                      <div className="h-32 bg-gray-900 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <MdLiveTv className="text-4xl text-gray-700 group-hover:text-emerald-energy transition-colors" />
                        </div>
                        <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                          {arch.duration}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-white line-clamp-1 mb-1">{arch.title}</h3>
                        <span className="text-xs text-white/40">
                          {format(new Date(arch.created_at), 'PPP', { locale: language === 'ar' ? ar : language === 'tr' ? tr : enUS })}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Latest News / Posts */}
            <div>
              {/* News Carousel */}
              <div className="relative overflow-hidden rounded-2xl glass-panel group h-[400px]">
                {posts.map((post, index) => (
                  <div
                    key={post.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                  >
                    <img
                      src={getImageUrl(post.image_url) || 'https://via.placeholder.com/800x400'}
                      alt={language === 'ar' ? post.title_ar : post.title_en}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-end p-8">
                      <span className="text-emerald-400 font-bold mb-2 uppercase tracking-wider text-sm">
                        {t.lastNews}
                      </span>
                      <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 leading-tight">
                        {language === 'ar' ? post.title_ar : language === 'tr' ? post.title_tr : post.title_en}
                      </h2>
                      <Link href={`/live`} className="btn-primary w-fit flex items-center gap-2">
                        <MdLiveTv /> {language === 'ar' ? 'شاهد البث المباشر' : 'Watch Live Stream'}
                      </Link>
                    </div>
                  </div>
                ))}

                {/* Carousel Controls (Hidden but auto works) */}
              </div>
            </div>
          </div>

          {/* Sidebar Area (1 Col) */}
          <div className="space-y-8">
            <div className="glass-panel p-4 rounded-xl sticky top-24">
              <h4 className="text-white font-bold mb-4 border-b border-gray-700 pb-2">Advertisement</h4>
              <AdSpace reference="home_sidebar" />
            </div>
          </div>

        </div>
      </div>

    </Layout>
  );
}


