import showPdf from './pdf.js';
import enableReadingPageUI from './ui.js';

let mouseDown = 0;
let firstClickedElement;

document.body.onmousedown = function (e) {
  ++mouseDown;
  firstClickedElement = e.target;
}
document.body.onmouseup = function () {
  --mouseDown;
}

let uploadBtn = document.querySelector('.uploadBtn');
let uploadInput = document.querySelector('.uploadInput');

uploadBtn.addEventListener('mousedown', () => {
  uploadBtn.classList.add('clicked');
});

uploadBtn.addEventListener('mouseleave', () => {
  if (uploadBtn.classList.contains('clicked'))
    uploadBtn.classList.remove('clicked');
});

uploadBtn.addEventListener('mouseenter', () => {
  if (mouseDown && firstClickedElement === uploadBtn)
    uploadBtn.classList.add('clicked');
});

uploadBtn.addEventListener('click', () => {
  uploadBtn.classList.remove('clicked');
  uploadInput.click();
});

uploadInput.onchange = (e) => {
  document.querySelector('.loading').removeAttribute('style');
  document.querySelector('.homeContainer').remove();
  showPdf(e.target.files[0]);
  enableReadingPageUI();
}