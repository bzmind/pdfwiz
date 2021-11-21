import express from 'express';

const app = express();
import router from '../routes/reader.js';
const port = 5500;
const ip = '127.0.0.1';
app.set('view engine', 'ejs');

app.use('/css', express.static('css'));
app.use('/node_modules', express.static('node_modules'));
app.use('/js', express.static('js'));
app.use('/docs', express.static('docs'));
app.use('/reader', readerRouter);

app.get('/', (req, res) => {
  res.render('index')
});

app.listen(port, ip);