import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import HeroSection from '../components/HeroSection';
import { getStreamStatus, StreamStatus } from '../lib/api';
import { MdLiveTv, MdArticle } from 'react-icons/md';
import Link from 'next/link';

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

      {/* Archives / Past Streams */}
      {archives.length > 0 && (
        <div className="container mx-auto px-4 lg:px-8 py-10 pb-0">
          <div className="flex items-center gap-3 mb-8">
            <MdLiveTv className="text-3xl text-emerald-energy" />
            <h2 className="text-3xl font-bold text-white">
              {language === 'ar' ? 'أرشيف البث' : 'Recorded Streams'}
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
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
      <div className="container mx-auto px-4 lg:px-8 py-20">
        <div className="flex items-center gap-3 mb-8">
          <MdArticle className="text-3xl text-emerald-energy" />
          <h2 className="text-3xl font-bold text-white">
            {t.lastNews}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {posts.map(post => (
            <Link key={post.id} href={`/posts/${post.id}`} className="glass-panel group rounded-xl overflow-hidden hover:border-emerald-energy transition-all block">
              <div className="h-48 bg-gray-800 overflow-hidden relative">
                <img
                  src={getImageUrl(post.image_url) || 'https://via.placeholder.com/400'}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  alt={language === 'ar' ? post.title_ar : post.title_en}
                />
                <div className="absolute top-3 left-3 bg-midnight-black/80 backdrop-blur px-2 py-1 rounded text-xs text-emerald-energy font-bold uppercase tracking-wider">
                  {post.category}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-energy transition-colors">
                  {language === 'ar' ? post.title_ar : language === 'tr' ? post.title_tr : post.title_en}
                </h3>
                <p className="text-white/60 text-sm line-clamp-3 mb-4">
                  {language === 'ar' ? post.content_ar : language === 'tr' ? post.content_tr : post.content_en}
                </p>
                <div className="flex items-center justify-between mt-4 border-t border-gray-800 pt-3">
                  <span className="text-xs text-white/40">
                    {format(new Date(post.created_at), 'PPP', { locale: language === 'ar' ? ar : language === 'tr' ? tr : enUS })}
                  </span>
                  <span className="text-xs text-emerald-energy font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    {t.viewDetails} &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {posts.length === 0 && (
            <div className="col-span-3 text-center text-white/50 py-10">No news updates available.</div>
          )}
        </div>
      </div>

    </Layout>
  );
}


