import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, DollarSign, Layout } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import ImageUpload from '../../components/ImageUpload';

interface Ad {
    id: number;
    reference: string;
    code: string;
    image_url: string;
    link_url: string;
    size: string;
    is_active: boolean;
}

const AdsPage = () => {
    const [ads, setAds] = useState<Ad[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<Partial<Ad>>({
        is_active: true,
        reference: 'home_top'
    });

    useEffect(() => {
        fetchAds();
    }, []);

    const fetchAds = async () => {
        try {
            const res = await fetch('/api/ads');
            const data = await res.json();
            if (data.data) setAds(data.data);
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this ad?")) return;
        await fetch(`/api/ads/${id}`, { method: 'DELETE' });
        setAds(ads.filter(a => a.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = isEditing && form.id ? `/api/ads/${form.id}` : '/api/ads';
        const method = isEditing && form.id ? 'PUT' : 'POST';

        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });

        setForm({ is_active: true, reference: 'home_top' });
        setIsEditing(false);
        fetchAds();
    };

    const handleEdit = (ad: Ad) => {
        setForm(ad);
        setIsEditing(true);
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Advertising</h2>
                        <p className="text-gray-400">Manage ad spaces and banners</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Form */}
                    <div className="glass-panel p-6 rounded-2xl h-fit">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            {isEditing ? <Edit2 size={18} /> : <Plus size={18} />}
                            {isEditing ? 'Edit Ad' : 'New Ad'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Placement Reference</label>
                                <select
                                    className="input-field w-full bg-midnight-black p-2 rounded border border-gray-700 text-white"
                                    value={form.reference}
                                    onChange={e => setForm({ ...form, reference: e.target.value })}
                                >
                                    <option value="home_top">Home Top Banner</option>
                                    <option value="home_sidebar">Home Sidebar</option>
                                    <option value="live_top">Live Page Top (Above Player)</option>
                                    <option value="live_sidebar">Live Page Sidebar</option>
                                    <option value="site_left">Global Left Skyscraper (Desktop)</option>
                                    <option value="site_right">Global Right Skyscraper (Desktop)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Ad Size / Dimensions</label>
                                <select
                                    className="input-field w-full bg-midnight-black p-2 rounded border border-gray-700 text-white"
                                    value={form.size || 'auto'}
                                    onChange={e => setForm({ ...form, size: e.target.value })}
                                >
                                    <option value="auto">Auto (Responsive)</option>
                                    <option value="728x90">Leaderboard (728x90)</option>
                                    <option value="300x250">Medium Rectangle (300x250)</option>
                                    <option value="336x280">Large Rectangle (336x280)</option>
                                    <option value="160x600">Wide Skyscraper (160x600)</option>
                                    <option value="468x60">Full Banner (468x60)</option>
                                </select>
                            </div>

                            <ImageUpload
                                value={form.image_url || ''}
                                onChange={(url) => setForm({ ...form, image_url: url })}
                                label="Ad Image (Optional)"
                            />

                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Target URL</label>
                                <input
                                    className="input-field w-full bg-midnight-black p-2 rounded border border-gray-700 text-white"
                                    placeholder="https://example.com"
                                    value={form.link_url || ''}
                                    onChange={e => setForm({ ...form, link_url: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Custom Code (e.g. Google Ads)</label>
                                <textarea
                                    className="input-field w-full bg-midnight-black p-2 rounded border border-gray-700 text-white h-24 font-mono text-xs"
                                    placeholder="<script>...</script>"
                                    value={form.code || ''}
                                    onChange={e => setForm({ ...form, code: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                                    className="accent-emerald-500 w-4 h-4"
                                />
                                <label className="text-sm text-gray-300">Is Active</label>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button className="flex-1 btn-primary py-2 flex justify-center items-center gap-2">
                                    <Save size={16} /> Save
                                </button>
                                {isEditing && (
                                    <button type="button" onClick={() => { setIsEditing(false); setForm({ is_active: true, reference: 'home_top' }); }}
                                        className="btn-secondary py-2 px-3">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-2 space-y-4">
                        {ads.map(ad => (
                            <div key={ad.id} className={`bg-gray-900 border border-gray-800 p-4 rounded-xl flex gap-4 group hover:border-emerald-energy transition-colors items-center ${!ad.is_active && 'opacity-50'}`}>
                                {ad.image_url ? (
                                    <div className="w-24 h-16 bg-gray-800 rounded-lg overflow-hidden shrink-0">
                                        <img src={ad.image_url} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-24 h-16 bg-gray-800 rounded-lg flex items-center justify-center shrink-0 text-emerald-500 font-mono text-xs p-2 overflow-hidden">
                                        &lt;Code/&gt;
                                    </div>
                                )}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs text-emerald-energy bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-900/50">
                                                    {ad.reference}
                                                </span>
                                                {!ad.is_active && <span className="text-xs text-red-500 bg-red-900/20 px-2 py-0.5 rounded">Inactive</span>}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                                <span>{ad.size === 'auto' || !ad.size ? 'Responsive' : ad.size}</span>
                                            </div>
                                            <p className="text-sm text-gray-300 truncate max-w-md">{ad.link_url || 'No Link'}</p>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(ad)} className="p-2 text-blue-400 hover:bg-blue-900/20 rounded"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(ad.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {ads.length === 0 && (
                            <div className="text-center text-gray-500 py-10">No active advertisements.</div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdsPage;
