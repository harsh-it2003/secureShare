require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const File = require('./models/fileSchema');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const Swal = require('sweetalert2');

const app = express();

// Setting the view engine as EJS, and rendering index.ejs in the response
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

const PORT = process.env.PORT;
const mongoURL = `mongodb+srv://harshitdudani8:${process.env.PASSWORD}@cluster0.1q2mnue.mongodb.net/?retryWrites=true&w=majority`;

mongoose.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads/'));
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    return res.render('index', { data: { justPassword: 0 } });
});

app.post('/upload', upload.single('file'), async (req, res) => {
    const file = req.file;
    const password = req.body.password;
    const fileInfo = {
        filename: file.filename,
        filePath: `${req.protocol}://${req.headers.host}/uploads/${file.filename}`,
    };
    if (password) {
        fileInfo.password = await bcrypt.hash(password, 10);
    }
    const doc = new File(fileInfo);
    doc.save()
        .then(() => {
            const url = `${req.protocol}://${req.headers.host}/${doc.id}`;
            const data = {
                link: url
            };
            return res.render('share', { data });
        })
        .catch((err) => {
            return res.send(err);
        });
});

app.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const doc = await File.findById(id);
        if (!doc) {
            throw new Error();
        }
        if (!doc.password) {
            const directoryPath = path.join(__dirname, 'uploads/');
            const filename = doc.filename;
            const filePath = path.join(directoryPath, filename);
            return res.download(filePath);
        }
        const data = { justPassword: 1, wrongPassword: req.session.wrongPassword || 0 };
        req.session.wrongPassword = 0;
        return res.render('index', { data });
    } catch (err) {
        return res.render('error');
    }
});

app.post('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const password = req.body.password;
        const doc = await File.findById(id);
        if (!doc) {
            throw new Error();
        }
        bcrypt.compare(password, doc.password, (err, result) => {
            if (err) {
                return res.send(err);
            }
            if (result) {
                const directoryPath = path.join(__dirname, 'uploads/');
                const filename = doc.filename;
                const filePath = path.join(directoryPath, filename);
                return res.download(filePath);
            }
            req.session.wrongPassword = 1;
            return res.redirect(`/${id}`);
        });
    } catch (err) {
        return res.send(err);
    }
});

app.listen(PORT, () => {
    console.log('Server listening on port ' + PORT);
});
