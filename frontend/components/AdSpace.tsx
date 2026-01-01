import React, { useState, useEffect } from 'react';

interface Ad {
    id: number;
    reference: string;
    code?: string;
    image_url?: string;
    link_url?: string;
    size?: string;
    is_active: boolean;
}

interface AdSpaceProps {
    reference: string; // e.g., 'home_top', 'sidebar', 'live_bottom'
    className?: string;
}

const AdSpace: React.FC<AdSpaceProps> = ({ reference, className }) => {
    const [ad, setAd] = useState<Ad | null>(null);

    useEffect(() => {
        // Fetch ads
        // Ideally the API should support filtering ?reference=xyz
        // For now we fetch all and filter
        fetch('/api/ads')
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    // Find the first active ad for this reference
                    // In a real system, might rotate ads or pick random
                    const found = data.data.find((a: Ad) => a.reference === reference && a.is_active);
                    setAd(found || null);
                }
            })
            .catch(err => console.error("Failed to load ads", err));
    }, [reference]);

    if (!ad) return null;

    return (
        <div className={`ad-container ${className || 'my-4'}`}>
            {ad.code ? (
                <div dangerouslySetInnerHTML={{ __html: ad.code }} />
            ) : (
                ad.image_url && (
                    <a href={ad.link_url || '#'} target="_blank" rel="noopener noreferrer"
                        className="block relative group overflow-hidden rounded-xl"
                        style={ad.size && ad.size !== 'auto' ? {
                            width: ad.size.split('x')[0] + 'px',
                            height: ad.size.split('x')[1] + 'px',
                            margin: '0 auto' // Center fixed size ads
                        } : undefined}>
                        <img
                            src={ad.image_url}
                            alt="Advertisement"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider backdrop-blur-sm">
                            Ad
                        </div>
                    </a>
                )
            )}
        </div>
    );
};

export default AdSpace;
