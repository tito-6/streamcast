import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Image from 'next/image';
import { MdPlayCircleOutline, MdCalendarToday, MdOutlineSportsEsports } from 'react-icons/md';
import Link from 'next/link';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Stream {
    id: number;
    title: string;
    description: string;
    thumbnail_url: string;
    sport_category: string;
    is_live: boolean;
    ingest_status: string;
    created_at: string;
}

const ArchivePage = () => {
    const [streams, setStreams] = useState<Stream[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStreams = async () => {
            try {
                const res = await fetch('http://localhost:8080/api/streams'); // In prod use env var
                const data = await res.json();
                // Filter for non-live streams
                if (data.data) {
                    const archived = data.data.filter((s: Stream) => !s.is_live);
                    setStreams(archived);
                }
            } catch (err) {
                console.error("Failed to load archive", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStreams();
    }, []);

    return (
        <Layout title="الأرشيف | المباريات السابقة" description="شاهد ملخصات ومباريات البطولات السابقة">
            <div className="pt-24 pb-12 bg-black min-h-screen">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-3 mb-8">
                        <MdCalendarToday className="text-3xl text-emerald-500" />
                        <h1 className="text-3xl font-bold text-white">أرشيف المباريات</h1>
                    </div>

                    {loading ? (
                        <div className="text-white text-center py-20">جاري التحميل...</div>
                    ) : streams.length === 0 ? (
                        <div className="text-gray-400 text-center py-20 bg-midnight-black rounded-xl border border-gray-800">
                            لا توجد مباريات مؤرشفة حالياً.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {streams.map((stream) => (
                                <div key={stream.id} className="bg-midnight-black rounded-xl overflow-hidden border border-gray-800 hover:border-emerald-500 transition-all group">
                                    <div className="relative aspect-video">
                                        {stream.thumbnail_url ? (
                                            <Image
                                                src={stream.thumbnail_url.startsWith('http') ? stream.thumbnail_url : `http://localhost:8080/${stream.thumbnail_url}`}
                                                alt={stream.title}
                                                fill
                                                className="object-cover transition-transform group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                                <MdOutlineSportsEsports className="text-6xl text-gray-700" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <MdPlayCircleOutline className="text-6xl text-white drop-shadow-lg" />
                                        </div>
                                        {stream.sport_category && (
                                            <span className="absolute top-2 right-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded">
                                                {stream.sport_category}
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <div className="text-gray-400 text-xs mb-2 flex items-center gap-1">
                                            <MdCalendarToday />
                                            {format(new Date(stream.created_at), 'PPP', { locale: ar })}
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{stream.title}</h3>
                                        <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                                            {stream.description || "لا يوجد وصف متاح لهذا البث."}
                                        </p>

                                        {/* Since we don't have a VOD player yet, we might just link to a details page or show notice */}
                                        <button className="w-full py-2 bg-gray-800 hover:bg-emerald-600 text-white rounded transition-colors text-sm font-bold">
                                            شاهد التفاصيل
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default ArchivePage;
