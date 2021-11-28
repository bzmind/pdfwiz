import * as UiModule from './ui.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

let allPages = 0;
let sidebarScale = 0.25;
let pdfDoc = null;
let pagesRefs = [];
let srPageAndText = [];
let srSpans = [];
let isSearching;
let pdfHash;
const pdfInfo = {
  position: '',
  zoom: '',
  theme: ''
}

const eventBus = new pdfjsViewer.EventBus();
const pdfLinkService = new pdfjsViewer.PDFLinkService({ eventBus });

// Get document
function showPdf(file) {
  let fileReader = new FileReader();

  fileReader.onload = function () {
    let typedArray = new Uint8Array(this.result);

    pdfjsLib.getDocument(typedArray).promise.then(function (_pdfDoc) {
      pdfDoc = _pdfDoc;
      allPages = pdfDoc.numPages;
      pdfHash = pdfDoc.fingerprints[0];
      getZoomAndThemeFromLs(pdfHash);
      makePageContainers();
      makeSidebar();
      setupPageRefs();
      document.querySelector('#allPages').textContent = allPages;
    });
  }

  fileReader.readAsArrayBuffer(file);
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
    observePageChange();
    checkPdf(pdfDoc.fingerprints[0]);
  });
}

function getZoomAndThemeFromLs(pdfHash) {
  if (localStorage.getItem(pdfHash) != null) {
    let zoom = parseFloat(JSON.parse(localStorage.getItem(pdfHash)).zoom);
    document.querySelector('input[name="scaleRadio"]:checked').checked = false;
    document.querySelectorAll('input[name="scaleRadio"]').forEach(inp => {
      if (inp.value == zoom) {
        inp.checked = "true";
      }
    });

    document.querySelector('.activeTheme').setAttribute('class', 'disabledTheme');
    let theme = JSON.parse(localStorage.getItem(pdfHash)).theme;
    document.getElementById(theme).setAttribute('class', 'activeTheme');
  } else {
    document.querySelector('input[name="scaleRadio"]:checked').checked = false;
    document.querySelectorAll('input[name="scaleRadio"]').forEach(inp => {
      if (inp.value == 1.2) {
        inp.checked = "true";
      }
    });
  }
}

function checkPdf(pdfHash) {
  if (localStorage.getItem(pdfHash) != null) {
    let lastPos = parseInt(JSON.parse(localStorage.getItem(pdfHash)).position);
    document.querySelector('.pdf-container').scrollTop = lastPos;
  }
}

// Render page
function renderPage(pageNum) {
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
    pageContainer.setAttribute('data-visible', 'true');

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
      });
    });
  });
}

function observePageChange() {
  function isVisible(entry) {
    entry.forEach((pageContainer) => {
      if (pageContainer.isIntersecting) {
        let currPage = parseInt(pageContainer.target.getAttribute('data-page'));
        console.log(pageContainer);
        updatePageNum(currPage);
      }
    });
  }

  let pageCounter = document.querySelector('#currPage');
  let pageContainers = document.querySelectorAll('.page-container');
  let sidebar = document.querySelector('.sidebar');
  let root = document.querySelector('body');
  let rootMargin = `-${root.offsetHeight / 2 - 1}px 0px -${root.offsetHeight / 2 - 1}px 0px`;

  let observer = new IntersectionObserver(isVisible, { root, rootMargin, threshold: 0 });
  pageContainers.forEach((container) => {
    observer.observe(container);
  });

  new ResizeObserver(() => {
    rootMargin = `-${root.offsetHeight / 2 - 1}px 0px -${root.offsetHeight / 2 - 1}px 0px`;
    observer.disconnect();
    observer = new IntersectionObserver(isVisible, { root, rootMargin, threshold: 0 });
    pageContainers.forEach((container) => {
      observer.observe(container);
    });
  }).observe(root);

  function updatePageNum(currPage) {
    pageCounter.value = currPage;

    if (sidebar.classList.contains('sidebar-on'))
      UiModule.updateSidebarPage(currPage);

    UiModule.checkButtons();
  }
}

// Enable Intersection Observer to lazy load pages
function enableObserver() {
  function isVisible(entry) {
    entry.forEach((container) => {
      if (container.isIntersecting) {
        let pageNum = parseInt(container.target.getAttribute('data-page'));
        if (!container.target.hasAttribute('data-visible')) {
          container.target.setAttribute('data-visible', 'true');
          if (isSearching) {
            renderPage(pageNum).then(() => {
              let searchWordsArr = srPageAndText[`${pageNum}R`];
              if (searchWordsArr != null)
                highlightSearchText(pageNum, searchWordsArr, false);
            });
          } else {
            renderPage(pageNum);
          }
        } else if (document.querySelector(`[data-page="${pageNum}"] .textLayer span.srHighlighted`) == null) {
          if (isSearching) {
            let searchWordsArr = srPageAndText[`${pageNum}R`];
            if (searchWordsArr != null)
              highlightSearchText(pageNum, searchWordsArr, false);
          }
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

function regexEscape(str) {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

let currentSr;

function searchAllPages(searchText) {
  clearPreviousSearchData();
  UiModule.checkSearchButtons();
  let promises = [];
  isSearching = true;

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
    let re = new RegExp(regexEscape(searchText), "gi");
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
  // repeat the rendering and highlighting process again
  let highlightedSpan = document.querySelectorAll(`[data-page="${pageNum}"] .textLayer span.srHighlighted`);

  if (highlightedSpan.length > 0) {
    let page = document.querySelector(`[data-page="${pageNum}"]`);
    page.setAttribute('data-searched', 'true');
    UiModule.checkSearchButtons();
    highlightedSpan[0].scrollIntoView({ block: 'center' });
  } else {
    if (pageTextLayer == undefined) {
      renderPage(pageNum).then(() => {
        let searchWordsArr = srPageAndText[`${pageNum}R`];
        if (searchWordsArr != null)
          highlightSearchText(pageNum, searchWordsArr, true);
      });
    } else {
      let searchWordsArr = srPageAndText[`${pageNum}R`];
      if (searchWordsArr != null)
        highlightSearchText(pageNum, searchWordsArr, true);
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
    let re = new RegExp(`${regexEscape(searchWord)}`, 'g');

    pageSpans.forEach(span => {
      let spanContent = span.textContent;
      console.log(span.innerHTML);

      if (spanContent.includes(searchWord)) {
        if (firstHighlightedSpan == undefined) {
          firstHighlightedSpan = span;
        }
        if (span.innerHTML.includes('srHighlighted')) {
          // This regex is only for grabbing the text outside of the span tag, so we can
          // highlight both the big "D" and the small "d" together
          let re = new RegExp(`(${regexEscape(searchWord)})(?![^<]*>|[^<>]*</)`, 'g');
          span.innerHTML = span.innerHTML.replace(re, `<span class="srHighlighted">${searchWord}</span>`);
        } else {
          span.innerHTML = span.innerHTML.replace(re, `<span class="srHighlighted">${searchWord}</span>`);
        }
      }
      console.log(span.innerHTML);
    });
  });

  let searchIndex = srSpans.length;

  pageSpans.forEach(span => {
    let spanContent = span.textContent;
    // Just to fill the srSpans in order of the actuall spans in the page
    // that's why I made this case insensitive regex, otherwise the above re,
    // would first push all the spans which have big 'D' for example, and then
    // it would push all the spans which had small 'd'
    let insensitiveRe = new RegExp(regexEscape(searchWordsArr[0]), 'gi');
    if (insensitiveRe.test(spanContent)) {
      if (span.className != 'srHighlighted' && !srSpans.includes(span)) {
        span.setAttribute('data-searchindex', searchIndex);
        srSpans.push(span);
        searchIndex++;
      }
    }
  });

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

function clearPreviousSearchData() {
  // If user was searching something else before this, and then it searched for sth else
  // then we need to clear any of the informations from the previous searched text
  // like currentsr, data-searchindex, and the page data-searched attribute
  currentSr = null;
  isSearching = false;
  for (let i = 0; i < srSpans.length; i++) {
    document.querySelector(`[data-searchindex="${i}"]`).removeAttribute('data-searchindex');
  }

  if (document.querySelector('[data-searched="true"]') != null)
    document.querySelector('[data-searched="true"]').removeAttribute('data-searched');

  // empty the srSpans from previous searched spans
  srSpans = [];
  srPageAndText = [];

  // The reason I'm getting the prevHighlight is that, if a parent span has two .srHighlighted in it's childern
  // then when I reach the first .srHighlighted from those two, then in that first loop, I'm cleaning it's parent's textContent
  // from ANY .srHighlighted spans, so then that second .srHighlighted is gone, it was there at our querySelectorAll query
  // but if there's two or more, we don't need them, we only need one .srHighlighted within a parent span, so then we will remove
  // any .srHighlighted from it, so when that second .srHighlighted is removed, it's no longer there, but it is still in our
  // highlights variable, so it'll return null and throws error, but I check if the second .srHighlighted has the same as the prevHighlight
  // it means that it's the second child of it's parent, we don't need it, so we return out in line 497
  let highlights = document.querySelectorAll('.srHighlighted');
  let prevHighlight;

  highlights.forEach((highlight) => {
    if (prevHighlight != null && prevHighlight.parentElement == highlight.parentElement)
      return;

    highlight.parentElement.textContent = highlight.parentElement.textContent.replace('<span class="srHighlighted">', '').replace('</span>', '');
    prevHighlight = highlight;
  });
}

export {
  allPages, makePageContainers, makeSidebar, searchAllPages, currentSr, srSpans,
  srPageAndText, clearPreviousSearchData, goToSearchResultPage, scrollToSrSpan, pdfHash
};
export default showPdf;