const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const app = express();
app.use(cors());
app.use(express.json());

// Configuration du Rate Limiter
const rateLimiter = new RateLimiterMemory({
    points: 100, 
    duration: 60
});

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
};

const SERVERS_PRIORITY = [
    { domains: ['vidzy', 'streamtape', 'voe'], name: '🚀 Premium VF', priority: 1 },
    { domains: ['uqload', 'uptostream'], name: '⚡ Rapide VF', priority: 2 },
    { domains: ['dood', 'mixdrop', 'vidoza'], name: '✅ Stable VF', priority: 3 }
];

async function fetchWithRetry(url, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await axios.get(url, {
                headers: HEADERS,
                timeout: 10000 // 10s est souvent suffisant
            });
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            // Backoff exponentiel : 1s, 2s, 4s...
            await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        }
    }
}

async function smartSearch(movie) {
    // Note: French-stream change souvent de domaine (.re, .io, .vip)
    const sources = [
        `https://french-stream.re/?s=${encodeURIComponent(movie)}`,
        `https://french-stream.pro/?s=${encodeURIComponent(movie)}`
    ];

    for (const source of sources) {
        try {
            const { data } = await fetchWithRetry(source);
            const $ = cheerio.load(data);
            
            // Sélecteur plus précis pour éviter les faux positifs (pubs)
            const movieLink = $('.result-item a, .movie-item a, a[href*="/films/"]')
                .first().attr('href');
                
            if (movieLink) {
                return {
                    url: movieLink.startsWith('http') ? movieLink : `https:${movieLink}`,
                    source
                };
            }
        } catch (e) {
            continue; 
        }
    }
    return null;
}

function extractServers(html) {
    const $ = cheerio.load(html);
    const servers = [];
    
    // On cherche dans les iframes ET les embeds
    $('iframe, embed').each((i, el) => {
        let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
        
        if (src) {
            const cleanUrl = src.startsWith('//') ? `https:${src}` : src;
            
            for (const serverType of SERVERS_PRIORITY) {
                if (serverType.domains.some(domain => cleanUrl.toLowerCase().includes(domain))) {
                    // Éviter les doublons
                    if (!servers.some(s => s.link === cleanUrl)) {
                        servers.push({
                            name: serverType.name,
                            link: cleanUrl,
                            priority: serverType.priority
                        });
                    }
                    break;
                }
            }
        }
    });
    
    return servers.sort((a, b) => a.priority - b.priority);
}

app.get('/scrape', async (req, res) => {
    try {
        // Consommation du rate limit avec gestion d'erreur dédiée
        try {
            await rateLimiter.consume(req.ip);
        } catch (rejRes) {
            return res.status(429).json({ error: "Trop de requêtes. Réessayez plus tard." });
        }
        
        const movie = req.query.q?.trim();
        if (!movie) return res.status(400).json({ error: "Paramètre 'q' manquant" });

        const moviePage = await smartSearch(movie);
        if (!moviePage) {
            return res.status(404).json({ servers: [], message: "Film non trouvé" });
        }

        const { data: pageData } = await fetchWithRetry(moviePage.url);
        const servers = extractServers(pageData);

        res.json({
            movie,
            source: moviePage.source,
            results: servers,
            total: servers.length,
            best: servers[0] || null
        });

    } catch (error) {
        console.error("Scrape Error:", error.message);
        res.status(500).json({ error: "Erreur lors de la récupération des données" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur actif sur le port ${PORT}`);
});

    try {
        const moviePage = await smartSearch(movie);
        if (!moviePage) {
            return res.json({ servers: [], message: "Film non trouvé" });
        }

        const { data: pageData } = await fetchWithRetry(moviePage.url);
        const servers = extractServers(pageData);

        res.json({
            movie,
            source: moviePage.source,
            servers,
            total: servers.length,
            best: servers[0]
        });

    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log('🚀 Serveur démarré sur port 3000');
});
