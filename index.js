const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/scrape', async (req, res) => {
    const movie = req.query.q;
    if (!movie) return res.json({ error: "Nom du film manquant" });

    try {
        // 1. On cherche le film sur une source française stable
        const searchUrl = `https://french-stream.vip/?s=${encodeURIComponent(movie)}`;
        const { data } = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const $ = cheerio.load(data);
        const moviePage = $('a[href*="/films/"]').first().attr('href');

        if (!moviePage) {
            return res.json({ servers: [], message: "Film non trouvé" });
        }

        // 2. On entre dans la page du film pour trouver les serveurs français
        const pageRes = await axios.get(moviePage, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $$ = cheerio.load(pageRes.data);
        let serversList = [];

        // 3. On extrait uniquement les liens des serveurs de streaming VF
        $$('iframe').each((i, el) => {
            const src = $$(el).attr('src');
            if (src) {
                // On filtre pour ne garder que les serveurs de qualité
                if (src.includes('vidzy') || src.includes('uqload') || src.includes('voe')) {
                    const cleanUrl = src.startsWith('//') ? `https:${src}` : src;
                    serversList.push({
                        name: src.includes('vidzy') ? "Serveur Premium VF" : "Serveur Rapide VF",
                        link: cleanUrl
                    });
                }
            }
        });

        res.json({
            movie: movie,
            servers: serversList
        });

    } catch (error) {
        res.json({ error: "Erreur lors de la récupération des serveurs" });
    }
});

app.listen(process.env.PORT || 3000);
