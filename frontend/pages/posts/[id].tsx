import React from 'react';
import Layout from '../../components/Layout';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { MdOutlineArticle, MdAccessTime, MdArrowBack } from 'react-icons/md';
import { format } from 'date-fns';
import { ar, enUS, tr } from 'date-fns/locale';

import { useLanguage } from '../../contexts/LanguageContext';
import { translations } from '../../utils/translations';

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

export async function getServerSideProps(context: any) {
    const { id } = context.query;
    try {
        const res = await fetch(`http://localhost:8080/api/posts/${id}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        return { props: { post: data.data } };
    } catch (e) {
        return { notFound: true };
    }
}

const PostDetailsPage = ({ post }: { post: Post }) => {
    const router = useRouter();
    const { language } = useLanguage();
    const t = translations[language];

    // Helper for safe image URL
    const getImageUrl = (url: string) => {
        if (!url) return null;
        if (url.startsWith('http') && !url.includes('localhost')) return url;
        if (url.includes('localhost')) {
            return url.replace('http://localhost:8080/uploads', '/uploads');
        }
        return `/uploads/${url}`; // Fallback if just filename
    };

    if (router.isFallback) {
        return <div className="text-white text-center py-20">{t.loading}</div>;
    }

    const title = language === 'ar' ? post.title_ar : language === 'tr' ? post.title_tr : post.title_en;
    const content = language === 'ar' ? post.content_ar : language === 'tr' ? post.content_tr : post.content_en;

    return (
        <Layout title={`${title} | ${t.lastNews}`} description={content?.substring(0, 150)} lang={language}>
            <div className="pt-24 pb-20 bg-black min-h-screen">
                <div className="container mx-auto px-4 max-w-4xl">

                    <button onClick={() => router.back()} className="text-gray-400 hover:text-white flex items-center gap-2 mb-6 transition-colors">
                        <MdArrowBack /> {t.back}
                    </button>

                    <article className="bg-midnight-black rounded-2xl overflow-hidden border border-gray-800">
                        <div className="relative w-full h-64 md:h-96">
                            {post.image_url ? (
                                <Image
                                    src={getImageUrl(post.image_url) || ''}
                                    alt={title}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                    <MdOutlineArticle className="text-8xl text-gray-700" />
                                </div>
                            )}
                            <div className="absolute top-4 right-4 max-w-xs">
                                <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                                    {post.category || "General"}
                                </span>
                            </div>
                        </div>

                        <div className="p-8">
                            <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                                {title}
                            </h1>

                            <div className="flex items-center text-gray-400 text-sm mb-8 pb-8 border-b border-gray-800">
                                <MdAccessTime className="mr-1" />
                                {format(new Date(post.created_at), 'PPP p', {
                                    locale: language === 'ar' ? ar : language === 'tr' ? tr : enUS
                                })}
                            </div>

                            <div className="prose prose-invert lg:prose-xl max-w-none text-gray-300">
                                <p className="whitespace-pre-line leading-relaxed">
                                    {content}
                                </p>
                            </div>
                        </div>
                    </article>
                </div>
            </div>
        </Layout>
    );
};

export default PostDetailsPage;
