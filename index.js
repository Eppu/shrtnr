const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const yup = require('yup');
const monk = require('monk');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { nanoid } = require('nanoid');

require('dotenv').config();


const db = monk(process.env.MONGODB_URI);
const urls = db.get('urls');
urls.createIndex({ slug: 1 }, { unique: true });
// Delete entries after 24h
urls.createIndex({"createdAt": 1 }, { expireAfterSeconds: 86400 });


const app = express();
app.enable('trust proxy');
app.use(morgan('common'));
app.use(express.json());
app.use(express.static('./public'));
app.use(helmet());

app.get('/:id', async (req, res) => {
    // Redirect to url
    const { id: slug } = req.params;
    try {
        const url = await urls.findOne({ slug });
        if (url) {
            res.redirect(url.url);
        }
        res.redirect(`/404.html`);
    } catch (error) {      
        res.redirect(`/404.html`);
    }
});

const schema = yup.object().shape({
    slug: yup.string().trim().matches(/^$|[\w\-]/i),
    url: yup.string().trim().url().required(),
  });

app.post('/url', slowDown({
    // Limit rate
    windowMs: 30 * 1000,
    delayAfter: 1,
    delayMs: 500,
}), rateLimit({
    windowMs: 30 * 1000,
    max: 1,
}), async (req, res, next) => {
    // create a short url
    let { slug, url } = req.body;
    try {
        // Validate input with schema
        await schema.validate({
            slug,
            url
        });
        if (url.includes('eetu.me')) {
            throw new Error ('Nice try. 🛑');
        }
        // if slug doesn't exist, create one
        if(!slug) {
            slug = nanoid(5);
            console.log(slug);
        } else {
            const existing = await urls.findOne({ slug });
            if(existing) {
                throw new Error('Slug already in use. 🐌');
            }
        }
        slug = slug.toLowerCase();
        console.log("slug in lower case: " + slug);
        const newUrl = {
            createdAt: new Date(),
            url,
            slug,
        };
        const created = await urls.insert(newUrl);
        // Remove urls after 24h
        setTimeout(removeURL, 86400000, slug);
        res.json(created);
    } catch (error) {
        next(error);
    }  
});

app.use((req, res, next) => {
    res.status(404).sendFile('/404.html');
})

app.use((error, req, res, next) => {
    if (error.status) {
        res.status(error.status);
    } else {
        res.status(500);
    }
    res.json({
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
    })
})

function removeURL(staleSlug) {
    urls.remove({"slug": staleSlug });
    console.log("Removed " + staleSlug);
}

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
})
