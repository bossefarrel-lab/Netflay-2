const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/scrape', async (req, res) => {
    const movie = req.query.q;
    if (!movie) return res.json({ message: "Veuillez ajouter ?q=NomDuFilm" });

    try {
        // Version simplifiée sans fioritures pour éviter l'erreur URL
        const searchUrl = "https://french-stream.vip/?s=" + encodeURIComponent(movie);
        
        const response = await axios.get(searchUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const $ = cheerio.load(response.data);
        const filmUrl = $('a[href*="/films/"]').first().attr('href');

        if (!filmUrl) return res.json({ servers: [], message: "Non trouvé" });

        const page = await axios.get(filmUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $$ = cheerio.load(page.data);
        let links = [];

        $$('iframe').each((i, el) => {
            let src = $$(el).attr('src');
            if (src && (src.includes('uqload') || src.includes('voe') || src.includes('dood') || src.includes('vidzy'))) {
                links.push(src.startsWith('//') ? "https:" + src : src);
            }
        });

        res.json({ title: movie, servers: links });

    } catch (error) {
        res.json({ error: "Problème de connexion au site source" });
    }
});

app.listen(process.env.PORT || 3000);
