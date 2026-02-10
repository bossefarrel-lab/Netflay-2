const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/scrape', async (req, res) => {
    const movie = req.query.q;
    if (!movie) return res.json({ error: "Titre vide" });
    try {
        const searchUrl = `https://french-stream.vip/?s=${encodeURIComponent(movie)}+vf`;
        const { data } = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        const filmUrl = $('a[href*="/films/"]').first().attr('href');
        if (!filmUrl) return res.json({ servers: [] });

        const { data: pageData } = await axios.get(filmUrl);
        const $$ = cheerio.load(pageData);
        let servers = [];
        $$('iframe').each((i, el) => {
            const src = $$(el).attr('src');
            if (src && (src.includes('uqload') || src.includes('voe') || src.includes('dood') || src.includes('vidzy'))) {
                servers.push(src);
            }
        });
        res.json({ title: movie, servers: servers });
    } catch (e) { res.json({ error: "Erreur de recherche" }); }
});

app.listen(process.env.PORT || 3000);
