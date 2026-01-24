import React from 'react';
import { Instagram } from 'lucide-react';
import Link from 'next/link';

const InstagramFeed = () => {
    const [posts, setPosts] = React.useState<any[]>([]);

    React.useEffect(() => {
        // Fetch from backend (which fetches from IG if token exists)
        fetch('/api/instagram')
            .then(res => res.json())
            .then(json => {
                if (json.data && Array.isArray(json.data)) {
                    setPosts(json.data.map((p: any) => ({
                        id: p.id,
                        img: p.media_url,
                        caption: p.caption || '',
                        permalink: p.permalink
                    })));
                }
            })
            .catch(err => console.error("IG Fetch Error", err));
    }, []);

    if (posts.length === 0) return null; // Or loading state

    return (
        <section className="container mx-auto px-4 lg:px-8 py-16">
            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-xl text-white shadow-lg">
                            <Instagram size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">@event_01s</h2>
                            <p className="text-gray-400 text-sm">Follow us on Instagram</p>
                        </div>
                    </div>
                    <a
                        href="https://www.instagram.com/event_01s/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary flex items-center gap-2 group"
                    >
                        <span>View Profile</span>
                        <Instagram size={18} className="group-hover:rotate-12 transition-transform" />
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {posts.map((post) => (
                        <a
                            key={post.id}
                            href={post.permalink || "https://www.instagram.com/event_01s/"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-square rounded-xl overflow-hidden bg-black/50 border border-gray-800 hover:border-pink-500/50 transition-all duration-300"
                        >
                            <img
                                src={post.img}
                                alt={post.caption}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                                <Instagram className="text-white mb-2" />
                                <p className="text-white text-sm font-medium line-clamp-2">{post.caption}</p>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default InstagramFeed;
