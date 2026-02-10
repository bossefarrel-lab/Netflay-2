const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/scrape', async (req, res) => {
    const movie = req.query.q;
    
    // Si pas de film, on donne un exemple au lieu de planter
    if (!movie) {
        return res.json({ message: "Ajoutez ?q=NomDuFilm à la fin de l'URL" });
    }

    try {
        // Recherche sur French-Stream
        const searchUrl = `https://french-stream.vip/?s=${encodeURIComponent(movie)}`;
        const response = await axios.get(searchUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000 
        });

        const $ = cheerio.load(response.data);
        const filmUrl = $('a[href*="/films/"]').first().attr('href');

        if (!filmUrl) {
            return res.json({ servers: [], message: "Film non trouvé" });
        }

        // Extraction des serveurs
        const page = await axios.get(filmUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $$ = cheerio.load(page.data);
        let servers = [];

        $$('iframe').each((i, el) => {
            const src = $$(el).attr('src');
            if (src && (src.includes('uqload') || src.includes('voe') || src.includes('dood') || src.includes('vidzy'))) {
                servers.push(src.startsWith('//') ? `https:${src}` : src);
            }
        });

        res.json({ title: movie, servers: servers });

    } catch (error) {
        res.json({ error: "Erreur de connexion", details: error.message });
    }
});

app.listen(process.env.PORT || 3000);
