const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

// Route de recherche
app.get('/scrape', async (req, res) => {
    const movie = req.query.q;
    
    // Vérifie si un titre est bien envoyé
    if (!movie) {
        return res.json({ error: "Veuillez fournir un titre de film (ex: ?q=Barbie)" });
    }

    try {
        // 1. Configuration de la recherche avec Headers pour simuler un vrai navigateur
        const searchUrl = `https://french-stream.vip/?s=${encodeURIComponent(movie)}`;
        
        const { data } = await axios.get(searchUrl, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://french-stream.vip/',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            timeout: 10000 // Attend 10 secondes max
        });

        const $ = cheerio.load(data);
        
        // 2. Trouver le premier lien de film dans les résultats
        const filmUrl = $('a[href*="/films/"]').first().attr('href');
        
        if (!filmUrl) {
            return res.json({ 
                title: movie, 
                servers: [], 
                message: "Aucun film trouvé sur French-Stream pour ce titre." 
            });
        }

        // 3. Aller sur la page du film pour extraire les lecteurs (iframes)
        const { data: pageData } = await axios.get(filmUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const $$ = cheerio.load(pageData);
        let servers = [];
        
        // 4. On cherche tous les lecteurs vidéo habituels
        $$('iframe').each((i, el) => {
            const src = $$(el).attr('src');
            if (src) {
                const s = src.toLowerCase();
                if (s.includes('uqload') || s.includes('voe') || s.includes('dood') || s.includes('vidzy')) {
                    // On s'assure que le lien commence par https:
                    const cleanSrc = src.startsWith('//') ? `https:${src}` : src;
                    servers.push(cleanSrc);
                }
            }
        });

        // 5. Réponse finale envoyée à ton application
        res.json({ 
            title: movie, 
            source_url: filmUrl,
            servers: servers 
        });

    } catch (error) {
        console.error("Erreur Scraping:", error.message);
        res.json({ 
            error: "Le serveur de streaming est inaccessible ou bloque la connexion.",
            details: error.message 
        });
    }
});

// Lancement du serveur sur Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Moteur NightFlix prêt sur le port ${PORT}`);
});
