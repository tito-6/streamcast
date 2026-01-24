import React, { useState, useEffect } from 'react';
import { Save, Server, Globe, Shield, Instagram } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';

const SettingsPage = () => {
    const [config, setConfig] = useState({
        siteName: 'StreamCast Platform',
        adminEmail: 'admin@streamcast.com',
        maintenanceMode: 'false',
        allowRegistration: 'true',
        instagram_username: 'event_01s',
        instagram_custom_feed: '[]'
    });

    useEffect(() => {
        // Fetch initial settings from backend
        fetch('/api/settings')
            .then(res => res.json())
            .then(json => {
                if (json.data) {
                    setConfig(prev => ({ ...prev, ...json.data }));
                }
            })
            .catch(err => console.error("Failed to load settings", err));
    }, []);

    const handleSave = async () => {
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            alert('Settings saved successfully!');
        } catch (e) {
            console.error(e);
            alert('Failed to save settings');
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
                    <p className="text-gray-400">Configure global system parameters</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* General Settings */}
                    <div className="glass-panel p-6 rounded-2xl space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Globe className="text-emerald-energy" />
                            <h3 className="text-lg font-bold text-white">General Configuration</h3>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Site Name</label>
                            <input
                                value={config.siteName}
                                onChange={e => setConfig({ ...config, siteName: e.target.value })}
                                className="w-full bg-midnight-black border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-energy transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Admin Email</label>
                            <input
                                value={config.adminEmail}
                                onChange={e => setConfig({ ...config, adminEmail: e.target.value })}
                                className="w-full bg-midnight-black border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-energy transition-colors"
                            />
                        </div>
                    </div>

                    {/* Social Media Settings */}
                    <div className="glass-panel p-6 rounded-2xl space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Instagram className="text-emerald-energy" />
                            <h3 className="text-lg font-bold text-white">Instagram Feed Settings</h3>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Instagram Username (Fallback)</label>
                            <input
                                value={config.instagram_username}
                                onChange={e => setConfig({ ...config, instagram_username: e.target.value })}
                                className="w-full bg-midnight-black border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-energy transition-colors"
                                placeholder="event_01s"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm text-gray-400">Instagram Post Links</label>

                            {(config.instagram_custom_feed || '').split('\n').filter(l => l.trim() !== '').map((link, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/50 text-xs font-bold">{idx + 1}</span>
                                        <input
                                            value={link}
                                            onChange={(e) => {
                                                const links = (config.instagram_custom_feed || '').split('\n');
                                                links[idx] = e.target.value;
                                                setConfig({ ...config, instagram_custom_feed: links.join('\n') });
                                            }}
                                            className="w-full bg-midnight-black border border-gray-700 rounded-lg p-3 pl-8 text-white text-sm focus:border-emerald-energy transition-colors"
                                            placeholder="Paste Instagram Link..."
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const links = (config.instagram_custom_feed || '').split('\n');
                                            links.splice(idx, 1);
                                            setConfig({ ...config, instagram_custom_feed: links.join('\n') });
                                        }}
                                        className="p-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={() => {
                                    const current = config.instagram_custom_feed || '';
                                    setConfig({ ...config, instagram_custom_feed: current + (current ? '\n' : '') + 'https://' });
                                }}
                                className="w-full py-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-500 hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-sm font-bold flex items-center justify-center gap-2"
                            >
                                <span>+ Add New Link</span>
                            </button>
                        </div>
                    </div>

                    {/* System Controls */}
                    <div className="glass-panel p-6 rounded-2xl space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="text-emerald-energy" />
                            <h3 className="text-lg font-bold text-white">System Controls</h3>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-800">
                            <div>
                                <h4 className="text-white font-medium">Maintenance Mode</h4>
                                <p className="text-xs text-gray-500">Disable public access to the site</p>
                            </div>
                            <button
                                onClick={() => setConfig({ ...config, maintenanceMode: config.maintenanceMode === 'true' ? 'false' : 'true' })}
                                className={`w-12 h-6 rounded-full transition-colors relative ${config.maintenanceMode === 'true' ? 'bg-emerald-energy' : 'bg-gray-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${config.maintenanceMode === 'true' ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-800">
                            <div>
                                <h4 className="text-white font-medium">User Registration</h4>
                                <p className="text-xs text-gray-500">Allow new users to sign up</p>
                            </div>
                            <button
                                onClick={() => setConfig({ ...config, allowRegistration: config.allowRegistration === 'true' ? 'false' : 'true' })}
                                className={`w-12 h-6 rounded-full transition-colors relative ${config.allowRegistration === 'true' ? 'bg-emerald-energy' : 'bg-gray-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${config.allowRegistration === 'true' ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={handleSave} className="btn-primary px-8 py-3 flex items-center gap-2">
                        <Save size={18} /> Save Changes
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
};

export default SettingsPage;
