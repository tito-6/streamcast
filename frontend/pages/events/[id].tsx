import React from 'react';
import Layout from '../../components/Layout';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { MdEvent, MdLocationOn, MdAccessTime, MdArrowBack, MdTv } from 'react-icons/md';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Event {
    id: number;
    title: string;
    sport: string;
    league: string;
    team_home: string;
    team_away: string;
    start_time: string;
    venue: string;
    broadcaster: string;
    thumbnail: string;
}

export async function getServerSideProps(context: any) {
    const { id } = context.query;
    try {
        const res = await fetch(`http://localhost:8080/api/events/${id}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        return { props: { event: data.data } };
    } catch (e) {
        return { notFound: true };
    }
}

const EventDetailsPage = ({ event }: { event: Event }) => {
    const router = useRouter();

    return (
        <Layout title={`${event.title} | فعاليات`} description={`شاهد تفاصيل مباراة ${event.team_home} ضد ${event.team_away}`}>
            <div className="pt-24 pb-20 bg-black min-h-screen">
                {/* Hero Background using thumbnail blurred */}
                <div className="absolute top-0 left-0 w-full h-[50vh] overflow-hidden z-0">
                    {event.thumbnail ? (
                        <Image
                            src={event.thumbnail && event.thumbnail.startsWith('data:') ? event.thumbnail : (event.thumbnail?.startsWith('http') ? event.thumbnail : `/uploads/${event.thumbnail}`)}
                            alt="Background"
                            fill
                            className="object-cover opacity-20 blur-xl"
                        />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black"></div>
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <button onClick={() => router.back()} className="text-gray-400 hover:text-white flex items-center gap-2 mb-8 transition-colors">
                        <MdArrowBack /> عودة للفعاليات
                    </button>

                    <div className="max-w-4xl mx-auto">
                        <div className="bg-midnight-black/80 backdrop-blur-md rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">

                            {/* Header / Matchup */}
                            <div className="bg-gradient-to-r from-gray-900 to-black p-8 text-center border-b border-gray-800">
                                <h1 className="text-emerald-500 font-bold tracking-widest uppercase text-sm mb-4">{event.league} - {event.sport}</h1>

                                <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                                    <div className="text-center">
                                        <h2 className="text-3xl md:text-4xl font-bold text-white">{event.team_home}</h2>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-500">VS</div>
                                    <div className="text-center">
                                        <h2 className="text-3xl md:text-4xl font-bold text-white">{event.team_away}</h2>
                                    </div>
                                </div>

                                <div className="mt-8 inline-flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full text-white">
                                    <MdAccessTime className="text-emerald-400" />
                                    {format(new Date(event.start_time), 'PPP p', { locale: ar })}
                                </div>
                            </div>

                            {/* Details Body */}
                            <div className="p-8 grid md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                                        <h3 className="text-gray-400 text-sm mb-1 uppercase tracking-wider">المكان</h3>
                                        <div className="flex items-center gap-2 text-xl text-white">
                                            <MdLocationOn className="text-red-500" />
                                            {event.venue || "غير محدد"}
                                        </div>
                                    </div>

                                    <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                                        <h3 className="text-gray-400 text-sm mb-1 uppercase tracking-wider">القناة الناقلة</h3>
                                        <div className="flex items-center gap-2 text-xl text-white">
                                            <MdTv className="text-blue-500" />
                                            {event.broadcaster || "قريباً"}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center">
                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-700 shadow-lg">
                                        {event.thumbnail ? (
                                            <Image
                                                src={event.thumbnail && event.thumbnail.startsWith('data:') ? event.thumbnail : (event.thumbnail?.startsWith('http') ? event.thumbnail : `/uploads/${event.thumbnail}`)}
                                                alt="Thumbnail"
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">
                                                <MdEvent size={48} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-gray-800 text-center">
                                <button className="btn-primary px-8 py-3 text-lg w-full md:w-auto">
                                    حجز تذكرة / مشاهدة البث
                                </button>
                                <p className="mt-2 text-xs text-gray-500">قد يتم توفير رابط البث قبل المباراة بدقائق</p>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default EventDetailsPage;
