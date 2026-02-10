const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/scrape', async (req, res) => {
    const movie = req.query.q;
    if (!movie) return res.json({ error: "Veuillez entrer un nom de film" });

    try {
        // Recherche sur une source type MovieBox / Pro-Stream (100% Français)
        const searchUrl = `https://monstream.org/search?q=${encodeURIComponent(movie)}`;
        
        const { data } = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const $ = cheerio.load(data);
        // On récupère le premier film qui correspond
        const movieLink = $('.movie-item a').first().attr('href');

        if (!movieLink) {
            return res.json({ servers: [], message: "Film non trouvé en VF" });
        }

        // Extraction des serveurs VF (Vidzy, Uqload, Upvid)
        const moviePage = await axios.get(movieLink, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $$ = cheerio.load(moviePage.data);
        let servers = [];

        $$('iframe, source').each((i, el) => {
            let src = $$(el).attr('src') || $$(el).attr('data-src');
            if (src && (src.includes('uqload') || src.includes('vidzy') || src.includes('voe'))) {
                servers.push(src.startsWith('//') ? "https:" + src : src);
            }
        });

        res.json({
            title: movie,
            servers: servers
        });

    } catch (error) {
        res.json({ error: "Erreur de connexion aux serveurs VF" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Moteur MovieBox prêt !"));
