import React, { useCallback, useEffect, useState } from 'react';
import {
    Instagram, Play, X, ExternalLink, Heart, MessageCircle, Eye,
    Layers, BadgeCheck, Loader2,
} from 'lucide-react';
import InstagramFeed from './InstagramFeed';

/* ------------------------------------------------------------------ */
/* Types matching /api/instagram/live (Zernio-backed sports engine)    */
/* ------------------------------------------------------------------ */
interface IgProfile {
    account_id: string;
    username: string;
    display_name: string;
    avatar: string;
    profile_url: string;
    bio: string;
    bio_links: { title: string; url: string }[];
    is_verified: boolean;
    followers: number;
    following: number;
    media_count: number;
}
interface IgStory {
    id: string;
    media_type: string;
    media_url: string;
    thumbnail_url: string;
    permalink: string;
    timestamp: string;
}
interface IgPost {
    id: string;
    caption: string;
    permalink: string;
    published_at: string;
    media_type: string;
    is_video: boolean;
    is_carousel: boolean;
    media_url: string;
    thumbnail_url: string;
    media_items: { type: string; url: string; thumbnail: string }[];
    likes: number;
    comments: number;
    views: number;
}
interface IgComment {
    id: string;
    text: string;
    created_at: string;
    likes: number;
    author: { username: string; avatar: string; is_owner: boolean };
    replies: { id: string; text: string; author: { username: string; avatar: string; is_owner: boolean } }[];
}
interface IgBundle {
    configured: boolean;
    profile: IgProfile | null;
    stories: IgStory[];
    posts: IgPost[];
}

const nf = (n: number) => {
    if (!n) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
};

const timeAgo = (iso: string) => {
    if (!iso) return '';
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
};

const GRADIENT_RING = 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]';

/* Signed IG CDN URLs expire; route them through the engine's caching proxy. */
const mediaSrc = (url?: string) => {
    if (!url) return '';
    try {
        const host = new URL(url).hostname;
        if (host.endsWith('.cdninstagram.com') || host.endsWith('.fbcdn.net')) {
            return `/api/sports-engine/api/instagram/media?u=${encodeURIComponent(url)}`;
        }
    } catch { /* relative or invalid: use as-is */ }
    return url;
};

/* ------------------------------------------------------------------ */
const InstagramLive = () => {
    const [bundle, setBundle] = useState<IgBundle | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [visibleCount, setVisibleCount] = useState(9);
    const [activeStory, setActiveStory] = useState<IgStory | null>(null);
    const [activePost, setActivePost] = useState<IgPost | null>(null);
    const [comments, setComments] = useState<IgComment[] | null>(null);
    const [commentsLoading, setCommentsLoading] = useState(false);

    const fetchBundle = useCallback(async () => {
        try {
            const res = await fetch('/api/sports-engine/api/instagram/live');
            const json: IgBundle = await res.json();
            setBundle(json);
        } catch (e) {
            console.error('IG live fetch', e);
            setBundle(null);
        } finally {
            setLoaded(true);
        }
    }, []);

    /* Mirror the IG account with a 2-hour refresh rate (matches server cache TTL). */
    useEffect(() => {
        fetchBundle();
        const id = setInterval(() => {
            if (document.visibilityState === 'visible') fetchBundle();
        }, 2 * 60 * 60 * 1000);
        return () => clearInterval(id);
    }, [fetchBundle]);

    const openPost = async (post: IgPost) => {
        setActivePost(post);
        setComments(null);
        if (!post.id) return;
        setCommentsLoading(true);
        try {
            const res = await fetch(`/api/sports-engine/api/instagram/comments/${encodeURIComponent(post.id)}`);
            const json = await res.json();
            setComments(Array.isArray(json.comments) ? json.comments : []);
        } catch {
            setComments([]);
        } finally {
            setCommentsLoading(false);
        }
    };

    if (!loaded) return null;
    /* Fall back to the classic (manual/admin) feed when Zernio isn't configured. */
    if (!bundle?.configured || !bundle.profile) return <InstagramFeed />;

    const { profile, stories, posts } = bundle;

    return (
        <section className="container mx-auto px-4 lg:px-8 py-16">
            <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden border border-white/5">
                {/* Background accents */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-full blur-[120px] -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-500/10 to-teal-600/10 rounded-full blur-[120px] -ml-48 -mb-48" />

                {/* Profile header */}
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-5 min-w-0">
                        <a
                            href={profile.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${GRADIENT_RING} p-[3px] rounded-full shrink-0 hover:scale-105 transition-transform`}
                        >
                            <div className="bg-midnight-black rounded-full p-[3px]">
                                {profile.avatar ? (
                                    <img src={mediaSrc(profile.avatar)} alt={profile.username} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover" />
                                ) : (
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 flex items-center justify-center">
                                        <Instagram size={28} className="text-pink-400" />
                                    </div>
                                )}
                            </div>
                        </a>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">@{profile.username}</h2>
                                <BadgeCheck size={20} className="text-sky-400 shrink-0" />
                            </div>
                            <p className="text-gray-400 font-medium truncate">{profile.display_name}</p>
                            {profile.bio && (
                                <p className="text-gray-300 text-sm mt-1.5 whitespace-pre-line leading-snug max-w-md">{profile.bio}</p>
                            )}
                            {profile.bio_links?.length > 0 && (
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                    {profile.bio_links.map((l) => (
                                        <a
                                            key={l.url}
                                            href={l.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sky-400 hover:text-sky-300 text-sm font-semibold inline-flex items-center gap-1"
                                        >
                                            <ExternalLink size={12} /> {l.title || l.url.replace(/^https?:\/\//, '').slice(0, 40)}
                                        </a>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-5 mt-2 text-sm">
                                <span className="text-white"><b className="font-black">{nf(profile.media_count || posts.length)}</b> <span className="text-gray-400">posts</span></span>
                                <span className="text-white"><b className="font-black">{nf(profile.followers)}</b> <span className="text-gray-400">followers</span></span>
                                {profile.following > 0 && (
                                    <span className="text-white"><b className="font-black">{nf(profile.following)}</b> <span className="text-gray-400">following</span></span>
                                )}
                            </div>
                        </div>
                    </div>
                    <a
                        href={profile.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="md:ms-auto group flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-2xl border border-white/10 transition-all duration-300 shrink-0"
                    >
                        <span className="text-white font-bold">Follow</span>
                        <Instagram size={18} className="text-pink-500 group-hover:scale-125 transition-transform" />
                    </a>
                </div>

                {/* Stories */}
                {stories.length > 0 && (
                    <div className="relative z-10 mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">Stories · live now</span>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                            {stories.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => setActiveStory(s)}
                                    className="flex flex-col items-center gap-1.5 shrink-0 group"
                                    aria-label="View story"
                                >
                                    <span className={`${GRADIENT_RING} p-[2.5px] rounded-full group-hover:scale-105 transition-transform`}>
                                        <span className="block bg-midnight-black rounded-full p-[2.5px]">
                                            <img
                                                src={mediaSrc(s.thumbnail_url || s.media_url)}
                                                alt=""
                                                className="w-16 h-16 rounded-full object-cover"
                                                loading="lazy"
                                            />
                                        </span>
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-semibold">{timeAgo(s.timestamp)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Posts grid */}
                <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {posts.slice(0, visibleCount).map((post) => (
                        <button
                            key={post.id || post.permalink}
                            onClick={() => openPost(post)}
                            className="group relative aspect-square rounded-2xl overflow-hidden bg-midnight-black/60 border border-white/5 hover:border-pink-500/40 transition-all duration-300 text-start"
                        >
                            <img
                                src={mediaSrc(post.is_video ? (post.thumbnail_url || post.media_url) : (post.media_url || post.thumbnail_url))}
                                alt={post.caption?.slice(0, 60) || 'Instagram post'}
                                loading="lazy"
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                    /* Last resort: try the other URL variant before giving up. */
                                    const img = e.target as HTMLImageElement;
                                    const alt = mediaSrc(post.is_video ? post.media_url : post.thumbnail_url);
                                    if (alt && img.src !== alt && !img.dataset.retried) {
                                        img.dataset.retried = '1';
                                        img.src = alt;
                                    } else {
                                        img.style.opacity = '0';
                                    }
                                }}
                            />
                            {/* type badge */}
                            <div className="absolute top-2.5 end-2.5 text-white drop-shadow z-10">
                                {post.is_video ? <Play size={18} fill="white" /> : post.is_carousel ? <Layers size={18} /> : null}
                            </div>
                            {/* hover engagement overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-5 z-10">
                                <span className="flex items-center gap-1.5 text-white font-black text-sm"><Heart size={16} fill="white" /> {nf(post.likes)}</span>
                                <span className="flex items-center gap-1.5 text-white font-black text-sm"><MessageCircle size={16} fill="white" /> {nf(post.comments)}</span>
                                {post.views > 0 && <span className="flex items-center gap-1.5 text-white font-black text-sm"><Eye size={16} /> {nf(post.views)}</span>}
                            </div>
                            {/* caption strip */}
                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent z-[5]">
                                <p className="text-white/90 text-[11px] font-semibold line-clamp-2 leading-snug">{post.caption}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Load more */}
                {posts.length > visibleCount && (
                    <div className="relative z-10 flex justify-center mt-6">
                        <button
                            onClick={() => setVisibleCount((c) => c + 12)}
                            className="px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition-all"
                        >
                            Show more ({posts.length - visibleCount} remaining)
                        </button>
                    </div>
                )}
            </div>

            {/* Story viewer */}
            {activeStory && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-10">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => setActiveStory(null)} />
                    <div className="relative w-full max-w-[420px] h-full max-h-[88vh] bg-black rounded-none md:rounded-[32px] overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(236,72,153,0.25)]">
                        <button onClick={() => setActiveStory(null)} className="absolute top-4 end-4 z-20 p-2.5 bg-black/60 hover:bg-pink-500 text-white rounded-xl transition-colors" aria-label="Close">
                            <X size={20} />
                        </button>
                        <div className="absolute top-4 start-4 z-20 flex items-center gap-2">
                            <img src={mediaSrc(bundle.profile?.avatar)} alt="" className="w-8 h-8 rounded-full object-cover border border-white/30" />
                            <span className="text-white text-sm font-bold drop-shadow">@{bundle.profile?.username}</span>
                            <span className="text-white/60 text-xs">{timeAgo(activeStory.timestamp)}</span>
                        </div>
                        {activeStory.media_type === 'video' ? (
                            <video src={mediaSrc(activeStory.media_url)} className="w-full h-full object-contain" autoPlay controls playsInline />
                        ) : (
                            <img src={mediaSrc(activeStory.media_url || activeStory.thumbnail_url)} alt="" className="w-full h-full object-contain" />
                        )}
                    </div>
                </div>
            )}

            {/* Post viewer with live comments */}
            {activePost && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-8">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => setActivePost(null)} />
                    <div className="relative w-full max-w-5xl h-full md:h-[85vh] bg-[#0d1117] md:rounded-3xl overflow-hidden border border-white/10 flex flex-col md:flex-row">
                        <button onClick={() => setActivePost(null)} className="absolute top-4 end-4 z-30 p-2.5 bg-black/60 hover:bg-pink-500 text-white rounded-xl transition-colors" aria-label="Close">
                            <X size={20} />
                        </button>

                        {/* Media side */}
                        <div className="md:flex-[1.3] bg-black flex items-center justify-center min-h-[40vh] md:min-h-0">
                            {activePost.is_video && activePost.media_url ? (
                                <video src={mediaSrc(activePost.media_url)} poster={mediaSrc(activePost.thumbnail_url)} className="w-full h-full object-contain max-h-[85vh]" controls autoPlay playsInline />
                            ) : (
                                <img src={mediaSrc(activePost.media_url || activePost.thumbnail_url)} alt="" className="w-full h-full object-contain max-h-[85vh]" />
                            )}
                        </div>

                        {/* Info side */}
                        <div className="md:w-[380px] flex flex-col border-t md:border-t-0 md:border-s border-white/10 min-h-0 flex-1">
                            <div className="p-4 flex items-center gap-3 border-b border-white/10 shrink-0">
                                <img src={mediaSrc(bundle.profile?.avatar)} alt="" className="w-9 h-9 rounded-full object-cover" />
                                <div className="min-w-0">
                                    <div className="text-white text-sm font-bold truncate">@{bundle.profile?.username}</div>
                                    <div className="text-gray-500 text-xs">{timeAgo(activePost.published_at)} ago</div>
                                </div>
                                <a href={activePost.permalink} target="_blank" rel="noopener noreferrer" className="ms-auto text-gray-400 hover:text-white" aria-label="Open on Instagram">
                                    <ExternalLink size={16} />
                                </a>
                            </div>

                            <div className="flex items-center gap-5 px-4 py-3 border-b border-white/10 text-sm shrink-0">
                                <span className="flex items-center gap-1.5 text-white font-bold"><Heart size={16} className="text-pink-500" fill="currentColor" /> {nf(activePost.likes)}</span>
                                <span className="flex items-center gap-1.5 text-white font-bold"><MessageCircle size={16} className="text-sky-400" /> {nf(activePost.comments)}</span>
                                {activePost.views > 0 && <span className="flex items-center gap-1.5 text-white font-bold"><Eye size={16} className="text-emerald-400" /> {nf(activePost.views)}</span>}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                                {activePost.caption && (
                                    <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{activePost.caption}</p>
                                )}

                                {commentsLoading && (
                                    <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold">
                                        <Loader2 size={14} className="animate-spin" /> Loading comments…
                                    </div>
                                )}

                                {comments?.map((c) => (
                                    <div key={c.id} className="flex gap-3">
                                        {c.author.avatar ? (
                                            <img src={mediaSrc(c.author.avatar)} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm leading-snug">
                                                <span className={`font-bold me-2 ${c.author.is_owner ? 'text-pink-400' : 'text-white'}`}>{c.author.username}</span>
                                                <span className="text-gray-300">{c.text}</span>
                                            </p>
                                            <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-3">
                                                <span>{timeAgo(c.created_at)}</span>
                                                {c.likes > 0 && <span className="flex items-center gap-1"><Heart size={10} /> {nf(c.likes)}</span>}
                                            </div>
                                            {c.replies?.map((r) => (
                                                <p key={r.id} className="text-sm leading-snug mt-2 ps-3 border-s border-white/10">
                                                    <span className={`font-bold me-2 ${r.author.is_owner ? 'text-pink-400' : 'text-white'}`}>{r.author.username}</span>
                                                    <span className="text-gray-400">{r.text}</span>
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {comments && comments.length === 0 && !commentsLoading && (
                                    <p className="text-gray-500 text-xs font-semibold">No comments yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </section>
    );
};

export default InstagramLive;
