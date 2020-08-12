const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const yup = require('yup');
const monk = require('monk');
const { nanoid } = require('nanoid');

require('dotenv').config();


const db = monk(process.env.MONGODB_URI);
const urls = db.get('urls');
urls.createIndex({ slug: 1 }, { unique: true });


const app = express();
app.enable('trust proxy');
app.use(morgan('tiny'));
app.use(express.json());
app.use(express.static('./public'));
app.use(helmet());


app.get('/url/:id', (req, res) => {
    // get short url by id 
    
});

app.get('/:id', async (req, res) => {
    // Redirect to url
    const { id: slug } = req.params;
    try {
        const url = await urls.findOne({ slug });
        if (url) {
            res.redirect(url.url);
        }
        res.redirect(`/?error=${slug} not found`);
    } catch (error) {      
        res.redirect(`/?error=Link not found`);
    }
});

const schema = yup.object().shape({
    slug: yup.string().trim().matches(/^$|[\w\-]/i),
    url: yup.string().trim().url().required(),
  });

app.post('/url', async (req, res, next) => {
    // create a short url
    let { slug, url } = req.body;
    try {
        // Validate input with schema
        await schema.validate({
            slug,
            url
        });
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
            url,
            slug,
        };
        const created = await urls.insert(newUrl);
        res.json(created);
    } catch (error) {
        next(error);
    }  
});

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

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
})
