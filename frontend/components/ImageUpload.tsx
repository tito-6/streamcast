import React, { useState } from 'react';
import { Upload, X, Loader } from 'lucide-react';
import { getImageUrl } from '../utils/image';

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, label = "Image" }) => {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.url) {
                onChange(data.url);
            }
        } catch (err) {
            console.error("Upload failed", err);
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{label}</label>

            <div className="border border-gray-700 rounded-xl p-3 bg-midnight-black/50 backdrop-blur-sm shadow-inner group/upload">
                {/* Preview Container */}
                <div className="mb-3">
                    {value ? (
                        <div className="relative group/preview rounded-lg overflow-hidden border border-gray-700 aspect-video bg-gray-900">
                            <img
                                src={getImageUrl(value)}
                                alt="Preview"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover/preview:scale-105"
                                onError={(e) => {
                                    console.error("[ImageUpload] Failed to load image:", getImageUrl(value));
                                    e.currentTarget.src = 'https://via.placeholder.com/400x225?text=Error+Loading+Image';
                                    e.currentTarget.className += " opacity-50";
                                }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => onChange('')}
                                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transform hover:scale-110 transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-lg text-gray-600 bg-black/40">
                            <Upload size={32} className="mb-2 opacity-20" />
                            <span className="text-xs font-medium">No Image Uploaded</span>
                        </div>
                    )}
                </div>

                {/* Upload Action */}
                <label className={`
                    flex flex-col items-center justify-center w-full py-4 px-2 
                    border-2 border-dashed border-gray-700 rounded-lg cursor-pointer 
                    transition-all duration-300
                    ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-emerald-500 hover:bg-emerald-500/5 group/btn'}
                `}>
                    <div className="flex items-center gap-3">
                        {uploading ? (
                            <Loader className="animate-spin text-emerald-energy" size={18} />
                        ) : (
                            <Upload className="text-gray-400 group-hover/btn:text-emerald-500 transition-colors" size={18} />
                        )}
                        <span className="text-sm font-bold text-gray-400 group-hover/btn:text-white transition-colors">
                            {uploading ? 'UPLOADING...' : (value ? 'CHANGE IMAGE' : 'UPLOAD IMAGE')}
                        </span>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                </label>
            </div>

            {/* Manual URL Input Overlay */}
            <div className="px-1">
                <input
                    type="text"
                    placeholder="Or paste external URL here..."
                    className="w-full bg-transparent border-b border-gray-800 text-[10px] text-gray-500 font-mono py-1.5 focus:border-emerald-500 focus:text-gray-300 outline-none transition-all"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </div>
    );
};

export default ImageUpload;
