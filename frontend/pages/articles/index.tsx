import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { MdArticle, MdAccessTime } from 'react-icons/md';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLanguage } from '../../contexts/LanguageContext';

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

const ArticlesPage = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const { language } = useLanguage();

    useEffect(() => {
        fetch('/api/posts')
            .then(res => res.json())
            .then(data => {
                if (data.data) setPosts(data.data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Layout title="المقالات والأخبار | Sport Events" description="تابع آخر أخبار الرياضة والمقالات الحصرية">
            <div className="pt-24 pb-20 bg-black min-h-screen">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-3 mb-10">
                        <MdArticle className="text-4xl text-emerald-500" />
                        <h1 className="text-3xl md:text-4xl font-bold text-white">
                            {language === 'ar' ? 'المقالات والأخبار' : language === 'tr' ? 'Makaleler ve Haberler' : 'Articles & News'}
                        </h1>
                    </div>

                    {loading ? (
                        <div className="text-white text-center py-20">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
                    ) : posts.length === 0 ? (
                        <div className="text-gray-400 text-center py-20 bg-midnight-black rounded-xl border border-gray-800">
                            {language === 'ar' ? 'لا توجد مقالات حالياً.' : 'No articles found.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {posts.map((post) => {
                                const title = language === 'ar' ? post.title_ar : language === 'tr' ? post.title_tr : post.title_en;
                                const content = language === 'ar' ? post.content_ar : language === 'tr' ? post.content_tr : post.content_en;
                                return (
                                    <Link href={`/posts/${post.id}`} key={post.id} className="group block h-full">
                                        <div className="bg-midnight-black rounded-2xl overflow-hidden border border-gray-800 hover:border-emerald-500 transition-all h-full flex flex-col shadow-lg hover:shadow-emerald-500/10">
                                            <div className="relative aspect-video overflow-hidden">
                                                {post.image_url ? (
                                                    <img
                                                        src={post.image_url}
                                                        alt={title}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                                        <MdArticle className="text-6xl text-gray-700" />
                                                    </div>
                                                )}
                                                <div className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                                                    {post.category || "General"}
                                                </div>
                                            </div>
                                            <div className="p-6 flex-1 flex flex-col">
                                                <div className="text-gray-400 text-xs mb-3 flex items-center gap-1">
                                                    <MdAccessTime />
                                                    {format(new Date(post.created_at), 'PPP')}
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                                                    {title}
                                                </h3>
                                                <p className="text-gray-400 text-sm line-clamp-3 mb-4 flex-1">
                                                    {content}
                                                </p>
                                                <div className="mt-auto pt-4 border-t border-gray-800">
                                                    <span className="w-full btn-primary py-2 flex items-center justify-center gap-2 text-sm font-bold group-hover:bg-emerald-600 transition-colors">
                                                        {language === 'ar' ? 'اقرأ المزيد' : 'Read More'} &larr;
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default ArticlesPage;
