import showPdf from './pdf.js';
import enableReadingPageUI from './ui.js';

let perfEntries = performance.getEntriesByType("navigation")[0];

if (perfEntries.type == 'reload') {
  localforage.removeItem('lastPdf');
}

getLastPdf();

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
  processPdf(e);
}

document.addEventListener('drop', (e) => {
  e.preventDefault();
  processPdf(e);
});

document.addEventListener('dragover', (e) => {
  e.preventDefault();
});

function processPdf(e) {
  let file;

  if (e.type == 'change')
    file = e.target.files[0];
  else if (e.type == 'drop')
    file = e.dataTransfer.items[0].getAsFile();

  if (file.type !== 'application/pdf') {
    let secondContainer = document.querySelector('.secondContainer');

    let errorDiv = document.createElement('div');
    errorDiv.className = 'error';

    let errorText = document.createElement('p');
    errorText.innerHTML = '<span>🧙‍♂️</span>oops! the selected file was not a PDF';

    errorDiv.appendChild(errorText);
    secondContainer.after(errorDiv);

    return;
  }

  document.querySelector('.homeContainer').remove();
  showPdf(file);
  enableReadingPageUI();
  setLastPdf(file);
}

function setLastPdf(file) {
  localforage.setItem('lastPdf', file);
}

function getLastPdf() {
  localforage.getItem('lastPdf', (err, value) => {
    if (err || !value) return;
    document.querySelector('.homeContainer').remove();
    enableReadingPageUI();
    showPdf(value);
  });
}