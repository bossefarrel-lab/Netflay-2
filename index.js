const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/scrape', async (req, res) => {
    const movie = req.query.q;
    if (!movie) return res.json({ message: "Ajoutez ?q=NomDuFilm" });

    try {
        // On nettoie le nom du film pour l'URL
        const cleanName = encodeURIComponent(movie);

        // On propose des lecteurs qui cherchent automatiquement la VF
        const links = [
            `https://vidsrc.me/embed/movie?title=${cleanName}`,
            `https://embed.su/embed/movie/${cleanName}`,
            `https://autoembed.to/movie/tmdb/${cleanName}?server=1`
        ];

        res.json({ 
            title: movie, 
            servers: links,
            note: "Si le premier lien n'est pas en VF, essaie le serveur suivant ou change la langue dans le lecteur."
        });

    } catch (error) {
        res.json({ error: "Erreur du moteur", details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Moteur prêt !");
});
