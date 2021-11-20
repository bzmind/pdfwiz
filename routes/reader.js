const express = require('express');
// import showPdf from '../js/pdf.js';
const router = express.Router();

router.get('/', (req, res) => {
  res.render('reader');
});

router.post('/', (req, res) => {
  // showPdf(req.body);
  res.redirect('/reader');
});

module.exports = router;