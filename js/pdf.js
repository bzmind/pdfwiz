"use strict";
import * as UiModule from './ui.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = '../node_modules/pdfjs-dist/build/pdf.worker.js';

let allPages = 0;
let sidebarScale = 0.25;
let pdfDoc = null;
let pagesRefs = [];
let srPageAndText = [];
let srSpans = [];
const url = '../docs/pdf.pdf';

const eventBus = new pdfjsViewer.EventBus();
const pdfLinkService = new pdfjsViewer.PDFLinkService({ eventBus });

// Get document
function showPdf() {
  pdfjsLib.getDocument(url).promise.then(function (_pdfDoc) {
    pdfDoc = _pdfDoc;
    allPages = pdfDoc.numPages;
    makePageContainers();
    makeSidebar();
    setupPageRefs();
    document.querySelector('#allPages').textContent = allPages;
  });
}

function setupInternalLink(internalLink) {
  internalLink.addEventListener('click', goToInternalLinkPage);
}

function goToInternalLinkPage(e) {
  let pageNum = getPageNumFromDestHash(e.target.hash);

  let pageToScroll = document.querySelector(`[data-page="${pageNum}"]`);
  pageToScroll.scrollIntoView({ block: 'start' });
}

function getPageNumFromDestHash(destHash) {
  const pattern = /[^{\}]+(?=})/g;
  let jsonDest = JSON.parse(`{${unescape(destHash).match(pattern)[0]}}`);

  let pageNum = pagesRefs[`${jsonDest.num}R`];
  return pageNum;
}

function setupPageRefs() {
  for (let pageNum = 1; pageNum <= allPages; pageNum++) {
    pdfDoc.getPage(pageNum).then(page => {
      const refStr = page.ref.gen === 0 ? `${page.ref.num}R` : `${page.ref.num}R${page.ref.gen}`;
      pagesRefs[refStr] = pageNum;
    });
  }
}

// Prepare the page containers
function makePageContainers() {

  document.querySelector('.pdf-container').innerHTML = "";

  let promise = pdfDoc.getPage(Math.floor(allPages / 2)).then(page => {
    let scale = parseFloat(document.querySelector('input[name="scaleRadio"]:checked').value);
    let viewport = page.getViewport({ scale });

    for (let i = 1; i <= allPages; i++) {
      let pageContainer = document.createElement('div');
      pageContainer.setAttribute('class', 'page-container');
      pageContainer.setAttribute('data-page', i);
      pageContainer.id = `page${i}`;
      pageContainer.style.minHeight = `${viewport.height}px`;
      pageContainer.style.minWidth = `${viewport.width}px`;

      if (document.querySelector('.activeTheme').id == 'dark')
        pageContainer.style.backgroundColor = 'black';
      else
        pageContainer.style.backgroundColor = 'white';

      document.querySelector('.pdf-container').appendChild(pageContainer);
    }
  });

  return promise.then(() => {
    enableObserver();
  });
}

// Render page
function renderPage(pageNum, scroll) {

  if (document.querySelector(`[data-page="${pageNum}"] > #pdfLayer`) != null)
    return;

  return pdfDoc.getPage(pageNum).then(page => {
    let scale = parseFloat(document.querySelector('input[name="scaleRadio"]:checked').value);
    let canvas = document.createElement('canvas');
    canvas.style.display = "block";
    canvas.id = "pdfLayer";

    if (document.querySelector('#dark').getAttribute('class') == 'activeTheme')
      canvas.classList.add('pdfLayerDark');
    else
      canvas.classList.add('pdfLayerLight');

    let ctx = canvas.getContext('2d');
    const viewport = page.getViewport({ scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    page.render({
      canvasContext: ctx,
      viewport
    });

    let pageContainer = document.querySelector(`[data-page="${pageNum}"]`);
    pageContainer.appendChild(canvas);

    return page.getTextContent().then(textContent => {
      let textLayer = document.createElement('div');
      textLayer.classList.add('textLayer');
      textLayer.style.left = `${canvas.offsetLeft}px`;
      textLayer.style.top = `${canvas.offsetTop}px`;
      textLayer.style.height = `${canvas.offsetHeight}px`;
      textLayer.style.width = `${canvas.offsetWidth}px`;

      pdfjsLib.renderTextLayer({
        textContent: textContent,
        container: textLayer,
        viewport: viewport,
        textDivs: []
      });

      document.querySelector(`[data-page="${pageNum}"]`).appendChild(textLayer);

      return page.getAnnotations().then((annotationData) => {
        // We add annotations to the same layer as text layer, so that
        // our links are actuall links and the texts are also selectable
        // otherwise it was causing the texts to be unselectable
        let textLayer = document.querySelector(`[data-page="${pageNum}"] .textLayer`);

        pdfjsLib.AnnotationLayer.render({
          annotations: annotationData,
          div: textLayer,
          viewport: viewport.clone({ dontFlip: true }),
          page: page,
          linkService: pdfLinkService,
          enableScripting: true,
          renderInteractiveForms: true
        });

        let internalLinks = document.querySelectorAll(`[data-page="${pageNum}"] .textLayer a.internalLink`);
        internalLinks.forEach(item => {
          setupInternalLink(item);
        });

        let searchWordsArr = srPageAndText[`${pageNum}R`];
        if (searchWordsArr != null)
          highlightSearchText(pageNum, searchWordsArr, scroll);
      });
    });
  });
}

// Enable Intersection Observer to lazy load pages
function enableObserver() {

  function isVisible(entry) {

    entry.forEach((container) => {
      if (container.isIntersecting) {
        if (!container.target.hasAttribute('data-visible')) {
          container.target.setAttribute('data-visible', 'true');
          let pageNum = parseInt(container.target.getAttribute('data-page'));
          renderPage(pageNum, false);
        }
      }
    });
  }

  let observer = new IntersectionObserver(isVisible, { threshold: 0 });

  let pageContainers = document.querySelectorAll('.page-container');

  pageContainers.forEach((container) => {
    observer.observe(container);
  });
}

// Setup sidebar
function makeSidebar() {
  let promise = pdfDoc.getPage(Math.floor(allPages / 2)).then(page => {

    let viewport = page.getViewport({ scale: sidebarScale });

    for (let i = 1; i <= allPages; i++) {
      let pageImageContainer = document.createElement('div');
      pageImageContainer.setAttribute('class', 'page-image-container');
      pageImageContainer.setAttribute('data-page-image', i);
      pageImageContainer.style.minHeight = `${viewport.height}px`;
      pageImageContainer.style.minWidth = `${viewport.width}px`;

      if (document.querySelector('.activeTheme').id == 'dark')
        pageImageContainer.style.backgroundColor = 'black';
      else
        pageImageContainer.style.backgroundColor = 'white';

      document.querySelector('.sidebar').appendChild(pageImageContainer);
    }
  })
  return promise.then(() => {
    enableSidebarObserver();
  });
}

function enableSidebarObserver() {

  function isVisible(entry) {
    entry.forEach((imgContainer) => {
      if (imgContainer.isIntersecting && !imgContainer.target.hasAttribute('data-visible')) {
        imgContainer.target.setAttribute('data-visible', 'true');
        let pageImageNum = parseInt(imgContainer.target.getAttribute('data-page-image'));
        renderPageImage(pageImageNum);
      }
    });
  }

  let observer = new IntersectionObserver(isVisible, { root: document.querySelector('.sidebar'), threshold: 0 });

  let pageImageContainers = document.querySelectorAll('.page-image-container');

  pageImageContainers.forEach((imgContainer) => {
    observer.observe(imgContainer);
  });
}

function renderPageImage(pageImageNum) {

  pdfDoc.getPage(pageImageNum).then(page => {

    let canvas = document.createElement('canvas');
    canvas.style.display = "block";
    canvas.id = "pdfImageLayer";

    let ctx = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: sidebarScale });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    page.render({
      canvasContext: ctx,
      viewport
    }).promise.then(() => {

      let aTag = document.createElement('a');
      aTag.href = `#page${pageImageNum}`;

      let img = document.createElement('img');
      img.src = canvas.toDataURL('image/jpeg');
      img.id = 'pdfPageImage';

      let theme = document.querySelector('.activeTheme').id;
      if (theme == 'dark') {
        img.setAttribute('class', 'darkImage');
      }

      let pageNumberSpan = document.createElement('span');
      pageNumberSpan.textContent = pageImageNum;

      aTag.appendChild(img);
      aTag.appendChild(pageNumberSpan);

      let pageImageContainer = document.querySelector(`[data-page-image="${pageImageNum}"]`);
      pageImageContainer.appendChild(aTag);
    });
  });
}

let currentSr;

function searchAllPages(searchText) {
  let promises = [];

  // If user was searching something else before this, and then it searched for sth else
  // then we need to clear any of the informations from the previous searched text
  // like currentsr, data-searchindex, and the page data-searched attribute
  currentSr = null;

  for (let i = 0; i < srSpans.length; i++) {
    document.querySelector(`[data-searchindex="${i}"]`).removeAttribute('data-searchindex');
  }

  if (document.querySelector('[data-searched="true"]') != null)
    document.querySelector('[data-searched="true"]').removeAttribute('data-searched');

  // empty the srSpans from previous searched spans
  srSpans = [];
  srPageAndText = [];

  for (let i = 1; i <= allPages; i++) {
    promises.push(getPageLinesPairs(searchText, i));
  }

  Promise.all(promises).then(results => {
    for (let i = 0; i < results.length; i++) {
      if (results[i].lines.length > 0) {
        srPageAndText[results[i].page + 'R'] = results[i].lines;
      }
    }
    let firstItemKey = Object.keys(srPageAndText)[0];
    let pageNum;
    if (firstItemKey != null)
      pageNum = parseInt(firstItemKey.replace('R', ''));

    if (srPageAndText[firstItemKey] != null)
      goToSearchResultPage(pageNum);
  });
}

function getPageLinesPairs(searchText, pageNum) {

  return pdfDoc.getPage(pageNum).then(page => {
    return page.getTextContent();
  }).then(textContent => {
    // Search combined text content using regular expression
    let text = textContent.items.map(function (i) { return i.str; }).join(' ');
    let re = new RegExp(searchText, "gi");
    let m;
    let lines = [];

    while (m = re.exec(text)) {
      let line = m[0];
      lines.push(line);
    }

    lines = lines.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });

    return { page: pageNum, lines: lines };
  });
}

function goToSearchResultPage(pageNum) {
  let pageTextLayer = document.querySelector(`[data-page="${pageNum}"] .textLayer`);

  // We check if a highlighted span already exists, which means that the user
  // has already seen this page and this page is arleady rendered and it was
  // already showing the highlighted span, so if it has been seen before, we don't
  // repeat the rendering and highlighting process again.
  let highlightedSpan = document.querySelectorAll(`[data-page="${pageNum}"] .textLayer span.srHighlighted`);

  if (highlightedSpan.length > 0) {
    let page = document.querySelector(`[data-page="${pageNum}"]`);
    page.setAttribute('data-searched', 'true');
    UiModule.checkSearchButtons();
    highlightedSpan[0].scrollIntoView({ block: 'center' });
  } else {
    if (pageTextLayer == undefined) {
      renderPage(pageNum, true);
    } else {
      renderPage(pageNum, false);
    }
  }
}

function highlightSearchText(pageNum, searchWordsArr, scroll) {
  if (document.querySelector('[data-searched="true"]') != null)
    document.querySelector('[data-searched="true"]').removeAttribute('data-searched');

  let page = document.querySelector(`[data-page="${pageNum}"]`);
  page.setAttribute('data-searched', 'true');

  let firstHighlightedSpan;

  let pageSpans = document.querySelectorAll(`[data-page="${pageNum}"] .textLayer span`);
  searchWordsArr.forEach((searchWord) => {
    let re = new RegExp(searchWord, 'g');

    pageSpans.forEach(span => {
      let spanContent = span.textContent;

      if (spanContent.includes(searchWord)) {
        if (firstHighlightedSpan == undefined) {
          firstHighlightedSpan = span;
        }
        if (span.innerHTML.includes('srHighlighted')) {
          // This regex is only for grabbing the text outside of the span tag, so we can
          // highlight both the big "D" and the small "d" together
          let re = new RegExp(`(${searchWord})(?![^<]*>|[^<>]*</)`, 'g');
          span.innerHTML = span.innerHTML.replace(re, `<span class="srHighlighted">${searchWord}</span>`);
        } else {
          span.innerHTML = span.innerHTML.replace(re, `<span class="srHighlighted">${searchWord}</span>`);
        }
      }
    });
  });

  let searchIndex = srSpans.length;

  pageSpans.forEach(span => {
    let spanContent = span.textContent;
    // Just to fill the srSpans in order of the actuall spans in the page
    // that's why I made this case insensitive regex, otherwise the above re,
    // would first push all the spans which have big 'D' for example, and then
    // it would push all the spans which had small 'd'
    let insensitiveRe = new RegExp(searchWordsArr[0], 'gi');
    if (insensitiveRe.test(spanContent)) {
      if (span.className != 'srHighlighted') {
        span.setAttribute('data-searchindex', searchIndex);
        srSpans.push(span);
        searchIndex++;
      }
    }
  });

  // srSpans.map(i => console.log(i.textContent));
  if (scroll) {
    currentSr = firstHighlightedSpan;
    firstHighlightedSpan.scrollIntoView({ block: 'center' });
  }
  UiModule.checkSearchButtons();
}

function scrollToSrPage(e) {
  let searchedPageNum = parseInt(document.querySelector('[data-searched="true"]').getAttribute('data-page'));
  let keys = Object.keys(srPageAndText);
  let pageIndex;

  if (e.target.classList.contains('prevSearchResult'))
    pageIndex = keys.indexOf(`${searchedPageNum}R`) - 1;
  else if (e.target.classList.contains('nextSearchResult')) {
    if (keys.indexOf(`${searchedPageNum}R`) == -1) {
      pageIndex = 1;
    } else {
      pageIndex = keys.indexOf(`${searchedPageNum}R`) + 1;
    }
  }

  let pageNum;

  if (pageIndex < 0 || pageIndex == keys.length)
    return;
  else
    pageNum = parseInt(keys[pageIndex].replace('R', ''));

  goToSearchResultPage(pageNum);
  UiModule.checkSearchButtons();
}

function scrollToSrSpan(e) {
  let searchedSpan = parseInt(currentSr.getAttribute('data-searchindex'));
  let spanIndex;

  if (e.target.classList.contains('prevSearchResult'))
    spanIndex = searchedSpan - 1;
  else if (e.target.classList.contains('nextSearchResult'))
    spanIndex = searchedSpan + 1;

  if (spanIndex < 0 || spanIndex == srSpans.length) {
    currentSr = null;
    scrollToSrPage(e);
  } else {
    currentSr = null;
    let spanToScroll = document.querySelector(`[data-searchindex="${spanIndex}"]`);
    currentSr = spanToScroll;
    spanToScroll.scrollIntoView({ block: 'center' });
  }

  UiModule.checkSearchButtons();
}

function emptySrPageAndText() {
  srPageAndText = [];
}

export { allPages, makePageContainers, makeSidebar, searchAllPages, currentSr, srSpans, srPageAndText, emptySrPageAndText, goToSearchResultPage, scrollToSrSpan };
export default showPdf;