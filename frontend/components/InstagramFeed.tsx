import React, { useState } from 'react';
import { Instagram, Play, X, ExternalLink } from 'lucide-react';

const InstagramFeed = () => {
    const [posts, setPosts] = useState<any[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

    React.useEffect(() => {
        fetch('/api/instagram')
            .then(res => res.json())
            .then(json => {
                if (json.data && Array.isArray(json.data)) {
                    setPosts(json.data.map((p: any) => ({
                        id: p.id,
                        img: p.media_url,
                        caption: p.caption || '',
                        permalink: p.permalink,
                        isVideo: p.is_video
                    })));
                }
            })
            .catch(err => console.error("IG Fetch Error", err));
    }, []);

    if (posts.length === 0) return null;

    return (
        <section className="container mx-auto px-4 lg:px-8 py-16">
            <div className="glass-panel p-8 rounded-3xl relative overflow-hidden border border-white/5">
                {/* Background Accents */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-full blur-[120px] -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-500/10 to-teal-600/10 rounded-full blur-[120px] -ml-48 -mb-48" />

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-2xl text-white shadow-2xl">
                            <Instagram size={36} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight">Social Updates</h2>
                            <p className="text-gray-400 font-medium tracking-wide">Stay connected with @event_01s</p>
                        </div>
                    </div>
                    <a
                        href="https://www.instagram.com/event_01s/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-2xl border border-white/10 transition-all duration-300"
                    >
                        <span className="text-white font-bold">Follow Us</span>
                        <Instagram size={18} className="text-pink-500 group-hover:scale-125 transition-transform" />
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post) => (
                        <div
                            key={post.id}
                            className="group relative aspect-[4/5] rounded-3xl overflow-hidden bg-midnight-black/60 border border-white/5 hover:border-pink-500/30 transition-all duration-500 shadow-2xl cursor-pointer"
                            onClick={() => {
                                if (post.isVideo) {
                                    const shortcode = post.permalink.split('/').filter(Boolean).pop();
                                    setSelectedVideo(`https://www.instagram.com/p/${shortcode}/embed/?autoplay=1`);
                                } else {
                                    window.open(post.permalink, '_blank');
                                }
                            }}
                        >
                            {/* Blurred Background to prevent 'black bars' */}
                            <img
                                src={post.img}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110"
                            />

                            {/* Main Image (Not cropped) */}
                            <img
                                src={post.img}
                                alt={post.caption}
                                className="relative z-10 w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.02]"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=800&fit=cover';
                                }}
                            />

                            {/* Gradient Overlay */}
                            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 to-transparent z-20" />

                            {/* Center Action Icon */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100 z-30">
                                {post.isVideo ? (
                                    <div className="w-20 h-20 bg-pink-500/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                                        <Play fill="white" size={32} className="text-white ml-1" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                                        <ExternalLink size={24} className="text-white" />
                                    </div>
                                )}
                            </div>

                            {/* Content Bottom */}
                            <div className="absolute inset-x-0 bottom-0 p-6 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500 z-30">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">
                                        {post.isVideo ? 'Reel / Video' : 'Latest Post'}
                                    </span>
                                </div>
                                <p className="text-white font-semibold line-clamp-2 text-sm leading-relaxed mb-4">
                                    {post.caption || "View our latest update on Instagram"}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Full Screen Video Modal */}
            {selectedVideo && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-10">
                    <div
                        className="absolute inset-0 bg-black/95 backdrop-blur-3xl"
                        onClick={() => setSelectedVideo(null)}
                    />

                    <div className="relative w-full max-w-[450px] h-full max-h-[90vh] bg-black rounded-none md:rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(236,72,153,0.3)] border border-white/10">
                        <button
                            onClick={() => setSelectedVideo(null)}
                            className="absolute top-6 right-6 z-[100] p-3 bg-black/60 hover:bg-pink-500 text-white rounded-2xl transition-all duration-300"
                        >
                            <X size={24} />
                        </button>

                        <iframe
                            src={selectedVideo}
                            className="w-full h-full border-0 absolute inset-0"
                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}
        </section>
    );
};

export default InstagramFeed;
