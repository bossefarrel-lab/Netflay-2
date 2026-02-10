const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting (100 req/min)
const rateLimiter = new RateLimiterMemory({
    points: 100, duration: 60
});

// Headers anti-detection
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive'
};

// Priorité des serveurs
const SERVERS_PRIORITY = [
    { domains: ['vidzy', 'streamtape', 'voe'], name: '🚀 Premium VF', priority: 1 },
    { domains: ['uqload', 'uptostream'], name: '⚡ Rapide VF', priority: 2 },
    { domains: ['dood', 'mixdrop'], name: '✅ Stable VF', priority: 3 }
];

// Fetch avec retry intelligent
async function fetchWithRetry(url, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await axios.get(url, {
                headers: HEADERS,
                timeout: 15000
            });
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(r => setTimeout(r, 2000 * i));
        }
    }
}

// Recherche multi-sources
async function smartSearch(movie) {
    const sources = [
        `https://french-stream.vip/?s=${encodeURIComponent(movie)}`,
        `https://french-stream.pro/?s=${encodeURIComponent(movie)}`
    ];

    for (const source of sources) {
        try {
            const { data } = await fetchWithRetry(source);
            const $ = cheerio.load(data);
            
            const movieLink = $('a[href*="/films/"], a[href*="/serie/"], .movie-item a')
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

// Extraction serveurs ultra-intelligente
function extractServers(html) {
    const $ = cheerio.load(html);
    const servers = [];
    
    $('iframe').each((i, el) => {
        let src = $(el).attr('src') || $(el).attr('data-src');
        if (src) {
            const cleanUrl = src.startsWith('//') ? `https:${src}` : src;
            
            for (const serverType of SERVERS_PRIORITY) {
                if (serverType.domains.some(domain => cleanUrl.includes(domain))) {
                    servers.push({
                        name: serverType.name,
                        link: cleanUrl,
                        priority: serverType.priority
                    });
                    break;
                }
            }
        }
    });
    
    return servers.sort((a, b) => a.priority - b.priority);
}

app.get('/scrape', async (req, res) => {
    await rateLimiter.consume(req.ip);
    
    const movie = req.query.q?.trim();
    if (!movie) return res.status(400).json({ error: "Paramètre 'q' manquant" });

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
