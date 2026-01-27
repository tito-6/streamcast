export const getImageUrl = (url: string | undefined | null) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return url;
    return `/uploads/${url}`;
};
