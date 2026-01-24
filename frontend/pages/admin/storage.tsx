import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Trash2, HardDrive, FileVideo, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const StoragePage = () => {
    const [archives, setArchives] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalSize, setTotalSize] = useState(0);

    const fetchArchives = async () => {
        try {
            const res = await fetch('/api/archives');
            const json = await res.json();
            if (json.data) {
                setArchives(json.data);
                const total = json.data.reduce((acc: number, curr: any) => acc + curr.file_size, 0);
                setTotalSize(total);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArchives();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this archive? This cannot be undone.')) return;
        try {
            await fetch(`/api/archives/${id}`, { method: 'DELETE' });
            fetchArchives();
        } catch (err) {
            console.error(err);
            alert('Failed to delete');
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-8">
                {/* Header & Stats */}
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Storage Management</h1>
                        <p className="text-gray-400">Manage recorded streams and free up disk space.</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-900/50 to-midnight-black p-6 rounded-2xl border border-emerald-500/30 flex items-center gap-4 shadow-lg w-full md:w-auto">
                        <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400">
                            <HardDrive size={32} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Total Archive Usage</p>
                            <p className="text-2xl font-bold text-white">{formatBytes(totalSize)}</p>
                        </div>
                    </div>
                </div>

                {/* Archives List */}
                <div className="glass-panel p-6 rounded-xl">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <FileVideo className="text-emerald-400" /> Recorded Archives
                    </h3>

                    {loading ? (
                        <div className="text-center py-12 text-gray-400">Loading archives...</div>
                    ) : archives.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-black/20 rounded-xl border border-dashed border-gray-700">
                            No archives found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-700 text-gray-400 text-sm">
                                        <th className="p-4">Filename / Title</th>
                                        <th className="p-4">Duration</th>
                                        <th className="p-4">Size</th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-300">
                                    {archives.map((arch) => (
                                        <tr key={arch.id} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="font-medium text-white">{arch.title}</div>
                                                <div className="text-xs text-gray-500 font-mono mt-1">{arch.file_path.split('/').pop()}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={16} className="text-gray-500" />
                                                    {arch.duration}
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono text-emerald-400 font-medium">
                                                {formatBytes(arch.file_size)}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar size={16} className="text-gray-500" />
                                                    {format(new Date(arch.created_at), 'MMM dd, yyyy HH:mm')}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(arch.id)}
                                                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                                                    title="Delete Archive"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default StoragePage;
