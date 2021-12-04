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
  processPdf(e);
}



function processPdf(e) {
  let file = e.target.files[0];

  if (file.type !== 'application/pdf') {
    let secondContainer = document.querySelector('.secondContainer');
    
    let errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    
    let errorText = document.createElement('p');
    errorText.innerHTML = '<span>🤔</span>the selected file was not a PDF';
    
    errorDiv.appendChild(errorText);
    secondContainer.after(errorDiv);
    
    return;
  }

  document.querySelector('.homeContainer').remove();
  showPdf(file);
  enableReadingPageUI();
}