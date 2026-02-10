const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/scrape', async (req, res) => {
    const movie = req.query.q;
    if (!movie) return res.json({ message: "Ajoutez ?q=NomDuFilm" });

    try {
        // On utilise un service AllOrigins pour contourner les blocages (Proxy)
        const searchUrl = `https://french-stream.vip/?s=${encodeURIComponent(movie)}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
        
        const response = await axios.get(proxyUrl);
        const data = JSON.parse(response.data.contents);
        
        const $ = cheerio.load(data);
        const filmUrl = $('a[href*="/films/"]').first().attr('href');

        if (!filmUrl) return res.json({ servers: [], message: "Film non trouvé" });

        // Deuxième étape pour extraire les serveurs
        const pageProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(filmUrl)}`;
        const pageResponse = await axios.get(pageProxy);
        const pageData = JSON.parse(pageResponse.data.contents);
        
        const $$ = cheerio.load(pageData);
        let links = [];

        $$('iframe').each((i, el) => {
            let src = $$(el).attr('src');
            if (src && (src.includes('uqload') || src.includes('voe') || src.includes('dood') || src.includes('vidzy'))) {
                links.push(src.startsWith('//') ? "https:" + src : src);
            }
        });

        res.json({ title: movie, servers: links });

    } catch (error) {
        res.json({ error: "Le site source bloque encore, essai avec un autre film" });
    }
});

app.listen(process.env.PORT || 3000);
