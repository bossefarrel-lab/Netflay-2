const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/scrape', async (req, res) => {
    const movie = req.query.q;
    if (!movie) return res.json({ message: "Ajoutez ?q=NomDuFilm" });

    try {
        // Utilisation d'une API de recherche directe plus robuste
        const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=a5266405788339599557b49479b69994&query=${encodeURIComponent(movie)}`;
        const response = await axios.get(searchUrl);
        
        if (response.data.results.length === 0) {
            return res.json({ servers: [], message: "Film non trouvé" });
        }

        const id = response.data.results[0].id;

        // On génère des liens vers des lecteurs multi-sources connus pour être stables
        const links = [
            `https://vidsrc.me/embed/movie?tmdb=${id}`,
            `https://embed.su/embed/movie/${id}`,
            `https://vidsrc.to/embed/movie/${id}`
        ];

        res.json({ 
            title: movie, 
            tmdb_id: id,
            servers: links 
        });

    } catch (error) {
        res.json({ error: "Erreur du moteur", details: error.message });
    }
});

app.listen(process.env.PORT || 3000);
