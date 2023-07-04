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

// setting the view engine setting as ejs, and we are rendering index.ejs in the res
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));


const PORT = process.env.PORT;
const password = process.env.PASSWORD;
const mongoURL = `mongodb+srv://harshitdudani8:${password}@cluster0.1q2mnue.mongodb.net/?retryWrites=true&w=majority`;


mongoose.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
})


const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    return res.render('index', { data: { justPassword: 0 } });
})

app.post('/upload', upload.single('file'), async (req, res) => {
    const file = req.file;
    const password = req.body.password;
    const fileInfo = {
        filename: file.filename,
        filePath: file.path,
    }
    if (password) {
        fileInfo.password = await bcrypt.hash(password, 10);
    }
    const doc = new File(fileInfo);
    doc.save()
        .then(() => {
            const url = process.env.URL + '/' + doc.id;
            const data = {
                link: url
            }
            return res.render('share', { data });
        })
        .catch((err) => {
            return res.send(err);
        });
})


// check this later, first check the file path and stuff
app.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const doc = await File.findById(id);
        // if the file is not found, it's sent in the catch block

        if (doc.password == undefined) {
            const directoryPath = './uploads/';
            const filename = doc.filename;
            const filePath = path.join(directoryPath, filename);
            return res.download(filePath);
        }

        // otherwise render the password page
        const data = { justPassword: 1, wrongPassword: req.session.wrongPassword };
        req.session.wrongPassword = 0;
        return res.render('index', { data });
    } 
    catch (err) {
        return res.render('error');
    }
})


app.post('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const password = req.body.password;
        const doc = await File.findById(id);

        bcrypt.compare(password, doc.password, (err, result) => {
            if (err) {
                return res.send(err);
            }
            else {
                if (result) {
                    const directoryPath = './uploads/';
                    const filename = doc.filename;
                    const filePath = path.join(directoryPath, filename);
                    return res.download(filePath);
                }
                else {
                    req.session.wrongPassword = 1;
                    return res.redirect(`/${id}`);
                }
            }
        });
    } catch (err) {
        return res.send(err);
    };
})


app.listen(PORT, () => {
    console.log('server listening to port ' + PORT);
})
