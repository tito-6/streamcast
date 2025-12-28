import { GetServerSideProps } from 'next';

const EXTERNAL_DATA_URL = 'https://sportevent.online';

function generateSiteMap(posts: any[], events: any[]) {
    const staticPages = [
        'https://sportevent.online',
        'https://sportevent.online/live',
        'https://sportevent.online/schedule',
        'https://sportevent.online/articles',
        'https://sportevent.online/sports'
    ];

    return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     ${staticPages
            .map((url) => {
                return `
       <url>
           <loc>${url}</loc>
           <lastmod>${new Date().toISOString()}</lastmod>
           <changefreq>daily</changefreq>
           <priority>0.7</priority>
       </url>
     `;
            })
            .join('')}
     ${posts
            .map(({ id, created_at }) => {
                return `
       <url>
           <loc>${`${EXTERNAL_DATA_URL}/posts/${id}`}</loc>
           <lastmod>${created_at ? new Date(created_at).toISOString() : new Date().toISOString()}</lastmod>
           <changefreq>weekly</changefreq>
           <priority>0.9</priority>
       </url>
     `;
            })
            .join('')}
     ${events
            .map(({ id, date }) => {
                return `
       <url>
           <loc>${`${EXTERNAL_DATA_URL}/events/${id}`}</loc>
           <lastmod>${date ? new Date(date).toISOString() : new Date().toISOString()}</lastmod>
           <changefreq>weekly</changefreq>
           <priority>0.8</priority>
       </url>
     `;
            })
            .join('')}
   </urlset>
 `;
}

function SiteMap() {
    // getServerSideProps will do the heavy lifting
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
    // We make an API call to gather the URLs for our site

    let posts = [];
    let events = [];

    try {
        const postsRes = await fetch('http://localhost:8080/api/posts');
        const postsData = await postsRes.json();
        if (postsData.data) posts = postsData.data;
    } catch (e) {
        console.error("Sitemap posts error", e);
    }

    try {
        // Assuming events API exists
        const eventsRes = await fetch('http://localhost:8080/api/events');
        const eventsData = await eventsRes.json();
        if (eventsData.data) events = eventsData.data;
    } catch (e) {
        console.error("Sitemap events error", e);
    }

    // We generate the XML sitemap with the posts data
    const sitemap = generateSiteMap(posts, events);

    res.setHeader('Content-Type', 'text/xml');
    // we send the XML to the browser
    res.write(sitemap);
    res.end();

    return {
        props: {},
    };
}

export default SiteMap;
