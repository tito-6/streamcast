import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface Post {
    id: number;
    title_ar: string;
    title_en: string;
    title_tr: string;
    content_ar: string;
    image_url: string;
    slug?: string;
}

interface NewsSliderProps {
    lang: 'ar' | 'en' | 'tr';
}

const NewsSlider: React.FC<NewsSliderProps> = ({ lang }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetch('/api/posts')
            .then(res => res.json())
            .then(json => {
                if (json.data && json.data.length > 0) {
                    setPosts(json.data.slice(0, 5)); // Top 5
                }
            })
            .catch(err => console.error("Slider data fetch error:", err));
    }, []);

    const resetTimeout = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    useEffect(() => {
        resetTimeout();
        timeoutRef.current = setTimeout(() => {
            setCurrentIndex((prev) => (prev === posts.length - 1 ? 0 : prev + 1));
        }, 5000); // 5s Auto Slide

        return () => resetTimeout();
    }, [currentIndex, posts]);

    const getImageUrl = (url: string) => {
        if (!url) return 'https://via.placeholder.com/800x400';
        if (url.startsWith('http') && !url.includes('localhost')) return url;
        if (url.includes('localhost')) {
            return url.replace('http://localhost:8080/uploads', '/uploads');
        }
        return `/uploads/${url}`;
    };

    if (posts.length === 0) return null;

    const activePost = posts[currentIndex];
    const translate = (ar: string, en: string, tr: string) =>
        lang === 'ar' ? ar : lang === 'tr' ? tr : en;

    return (
        <section className="relative min-h-[650px] w-full overflow-hidden pt-28 flex items-center">
            {/* Background Image (Blurred) */}
            <div className="absolute inset-0 z-0">
                <img
                    key={currentIndex}
                    src={getImageUrl(activePost.image_url)}
                    className="w-full h-full object-cover blur-md scale-110 opacity-50 transition-all duration-1000"
                    alt="bg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-midnight-black via-midnight-black/80 to-transparent" />
            </div>

            <div className="relative z-10 container mx-auto px-4 h-full flex items-center justify-center">
                <div className="glass-panel w-full max-w-4xl p-0 overflow-hidden rounded-2xl flex flex-col md:flex-row shadow-2xl animate-fade-in-up">

                    {/* Image Side */}
                    <div className="w-full md:w-1/2 h-64 md:h-[400px] relative">
                        <img
                            src={getImageUrl(activePost.image_url)}
                            className="w-full h-full object-cover"
                            alt="News"
                        />
                        <div className="absolute top-4 left-4 bg-emerald-600 text-white text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                            {translate('أحدث الأخبار', 'Latest News', 'Son Haberler')}
                        </div>
                    </div>

                    {/* Content Side */}
                    <div className="w-full md:w-1/2 p-8 flex flex-col justify-center bg-midnight-black/90 md:text-right text-center">
                        <h2 className="text-2xl md:text-3xl font-black text-white mb-4 leading-tight">
                            {translate(activePost.title_ar, activePost.title_en, activePost.title_tr)}
                        </h2>
                        <p className="text-gray-400 line-clamp-3 mb-8 text-sm md:text-base">
                            {translate(activePost.content_ar, activePost.title_en, activePost.title_tr)}
                            {/* Only title available for fallback content in this mock, use content if available */}
                        </p>

                        <div className="flex justify-center md:justify-end gap-4">
                            <Link href="/live" className="btn-primary bg-red-600 hover:bg-red-700 px-8 py-3 flex items-center gap-2 animate-pulse">
                                <span className="w-2 h-2 bg-white rounded-full"></span>
                                {translate('شاهد البث الحي', 'Watch Live', 'Canlı İzle')}
                            </Link>
                            <Link href={`/posts/${activePost.slug || activePost.id}`} className="btn-secondary px-8 py-3">
                                {translate('اقرأ المزيد', 'Read More', 'Devamını Oku')}
                            </Link>
                            <div className="flex gap-2 items-center">
                                {posts.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`w-3 h-3 rounded-full transition-all ${idx === currentIndex ? 'bg-emerald-500 scale-125' : 'bg-gray-600 hover:bg-gray-500'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default NewsSlider;
