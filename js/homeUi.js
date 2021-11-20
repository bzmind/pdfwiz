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
  let file = e.target.files[0];
  let fd = new FormData();
  fd.append(uploadInput, file);

  $.ajax({
    url: '/reader',
    method: 'POST',
    data: fd,
    cache: false,
    processData: false,
    contentType: 'application/pdf',
    beforeSend: function () {
      console.log("Uploading, please wait....");
    },
    success: function () {
      console.log("Upload success.");
    },
    error: function () {
      console.log("ERROR in upload");
    },
    complete: function () {
      console.log("upload complete.");
    }
  }).done(() => {
    window.location.href = '/reader';
  });
}