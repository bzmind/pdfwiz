import * as pdfModule from './PdfProcessor.js';

let checkSearchButtons;
let checkButtons;
let updateSidebarPage;
let updateLocalStorage;

function enableReadingPageUI()
{
  let prevPageNum;
  let sidebar = document.querySelector('.sidebar');
  let pageInfo = document.querySelector('.pageInfo');
  let prevButton = document.querySelector('#prev-page');
  let nextButton = document.querySelector('#next-page');
  let pageCounter = document.querySelector('#currPage');
  let pdfContainer = document.querySelector('.pdf-container');
  let sidebarParent = document.querySelector('.sidebarParent');

  pageCounter.value = 1;

  if (sidebar.classList.contains('sidebar-on'))
    sidebarParent.style.display = 'flex';
  else
    sidebarParent.style.display = 'none';

  window.onunload = () =>
  {
    updateLocalStorage();
  };

  // Button events
  prevButton.addEventListener('click', showPrevPage);
  nextButton.addEventListener('click', showNextPage);

  const pdfInfo = {
    position: '',
    zoom: '',
    theme: ''
  }

  checkButtons = function ()
  {
    if (pageCounter.value == 1)
    {
      prevButton.disabled = true;
    } else
    {
      prevButton.disabled = false;
    }

    if (pageCounter.value == pdfModule.allPages)
    {
      nextButton.disabled = true;
    } else
    {
      nextButton.disabled = false;
    }
  }

  updateSidebarPage = function (pageNum)
  {
    let sidebarTarget = document.querySelector(`[data-page-image="${pageNum}"]`);
    sidebarTarget.scrollIntoView({ block: 'start' });
  }

  checkButtons();

  updateLocalStorage = function ()
  {
    pdfInfo.position = pdfContainer.scrollTop;
    pdfInfo.zoom = document.querySelector('input[name="scaleRadio"]:checked').value;
    pdfInfo.theme = document.querySelector('.activeTheme').id;

    let strPdfInfo = JSON.stringify(pdfInfo);
    localStorage.setItem(pdfModule.pdfHash, strPdfInfo);
  }

  function showPrevPage()
  {
    let currPage = parseInt(pageCounter.value);
    goToPage(currPage - 1);
  }

  function showNextPage()
  {
    let currPage = parseInt(pageCounter.value);
    goToPage(currPage + 1);
  }

  function goToPage(page)
  {
    let target = document.querySelector(`[data-page="${page}"]`);
    if (target != null)
      target.scrollIntoView({ block: 'start' });
    else
      document.querySelector(`[data-page="${prevPageNum}"]`).scrollIntoView({ block: 'start' });
  }

  // Scale button & menu
  let scaleBtn = document.querySelector('#scaleBtn');
  let scaleMenu = document.querySelector('#scale-menu');

  scaleBtn.addEventListener('click', toggleScaleMenu);

  function toggleScaleMenu()
  {

    if (scaleBtn.getAttribute('class') == 'clicked')
    {
      scaleBtn.removeAttribute('class');
      scaleMenu.removeAttribute('class');
    } else
    {
      scaleBtn.setAttribute('class', 'clicked');
      scaleMenu.setAttribute('class', 'on');
    }
  }

  // The scale levels in the scale menu
  let scaleRadios = document.querySelectorAll('input[name="scaleRadio"]');
  scaleRadios.forEach((item) =>
  {
    item.addEventListener('change', zoom);
  });
  function zoom()
  {
    let lastPdfHeight = pdfContainer.scrollHeight;
    updateLocalStorage();

    pdfModule.makePageContainers().then(() =>
    {
      let ratio = pdfContainer.scrollHeight / lastPdfHeight;
      let newScrollPosition = pdfContainer.scrollTop * ratio;
      pdfContainer.scrollTop = newScrollPosition;
    });
  }

  // Search button
  let searchBtn = document.querySelector('#searchBtn');
  let searchMenu = document.querySelector('#searchInputContainer');

  searchBtn.addEventListener('click', toggleSearchMenu);

  function toggleSearchMenu()
  {
    if (searchBtn.getAttribute('class') == 'clicked')
    {
      searchBtn.removeAttribute('class');
      searchMenu.removeAttribute('class');
      searchInput.value = '';
      pdfModule.clearPreviousSearchData();
    } else
    {
      searchMenu.setAttribute('class', 'on');
      searchBtn.setAttribute('class', 'clicked');
      document.querySelector('.prevSearchResult').disabled = true;
      document.querySelector('.nextSearchResult').disabled = true;
      setTimeout(() =>
      {
        document.querySelector('.searchInput').focus();
      }, 50);
    }
  }

  // Search Input
  let searchInput = document.querySelector('#searchInputContainer .searchInput');
  searchInput.addEventListener('keyup', (e) =>
  {
    if ((e.key === 'Enter' || e.keyCode === 13) && searchInput.value.length != 0)
    {
      pdfModule.searchAllPages(searchInput.value);
    }
  });

  let prevSearchResult = document.querySelector('.prevSearchResult');
  let nextSearchResult = document.querySelector('.nextSearchResult');

  prevSearchResult.addEventListener('click', goToSrSpan);
  nextSearchResult.addEventListener('click', goToSrSpan);

  function goToSrSpan(e)
  {
    pdfModule.scrollToSrSpan(e);
  }

  checkSearchButtons = function checkSearchButtons()
  {
    let prevSrBtn = document.querySelector('.prevSearchResult');
    let nextSrBtn = document.querySelector('.nextSearchResult');
    let searchInput = document.querySelector('.searchInput');
    let currSpanIndex;

    if (pdfModule.currentSr != null)
      currSpanIndex = parseInt(pdfModule.currentSr.getAttribute('data-searchindex'));
    else
      currSpanIndex = 0;

    let keys = Object.keys(pdfModule.srPageAndText);

    if (searchInput.value == '')
    {
      prevSrBtn.disabled = true;
      nextSrBtn.disabled = true;
    }

    if (currSpanIndex == 0)
    {
      prevSrBtn.disabled = true;
    } else
    {
      prevSrBtn.disabled = false;
    }

    if (keys.length > 0)
    {
      if (currSpanIndex == keys.length - 1)
      {
        nextSrBtn.disabled = true;
      } else
      {
        nextSrBtn.disabled = false;
      }
    } else
    {
      nextSrBtn.disabled = true;
    }
  }

  // Toggle Theme
  let themeBtn = document.querySelector('#themeBtn');
  themeBtn.addEventListener('click', toggleTheme);

  function toggleTheme()
  {
    let activeTheme = document.querySelector('.activeTheme');
    let disabledTheme = document.querySelector('.disabledTheme');

    activeTheme.removeAttribute('class');
    activeTheme.setAttribute('class', 'disabledTheme');

    disabledTheme.removeAttribute('class');
    disabledTheme.setAttribute('class', 'activeTheme');

    document.querySelectorAll('#pdfLayer').forEach((item) =>
    {
      item.classList.toggle('pdfLayerDark');
    });

    document.querySelectorAll('#pdfPageImage').forEach((itme) =>
    {
      itme.classList.toggle('darkImage');
    });

    document.querySelectorAll('.page-container').forEach((item) =>
    {
      if (item.style.backgroundColor == 'black')
        item.style.backgroundColor = 'white';
      else
        item.style.backgroundColor = 'black';
    });

    document.querySelectorAll('.page-image-container').forEach((item) =>
    {
      if (item.style.backgroundColor == 'black')
        item.style.backgroundColor = 'white';
      else
        item.style.backgroundColor = 'black';
    });

    updateLocalStorage();
  }

  // Document click
  document.addEventListener('click', docClicked);
  function docClicked(e)
  {
    if (e.target != scaleMenu && !scaleMenu.contains(e.target)
      && e.target != scaleBtn && !scaleBtn.contains(e.target))
    {
      scaleMenu.removeAttribute('class');
      scaleBtn.removeAttribute('class');
    }

    if (e.target != searchMenu && !searchMenu.contains(e.target)
      && e.target != searchBtn && !searchBtn.contains(e.target)
      && e.target != pageInfo && !pageInfo.contains(e.target)
      && searchMenu.className == 'on')
    {
      searchMenu.removeAttribute('class');
      searchBtn.removeAttribute('class');
      searchInput.value = '';
      pdfModule.clearPreviousSearchData();
    }
  }

  // Setup CTRL + F shortcut for search input
  // First disable CTRL + F of chrome
  window.addEventListener("keydown", function (e)
  {
    if (e.ctrlKey && e.key === 'f' || e.code == 'KeyF')
    {
      e.preventDefault();
    }
  });

  window.onkeyup = (e) =>
  {
    if (e.ctrlKey && e.key == 'f' || e.code == 'KeyF')
    {
      toggleSearchMenu();
    }
  }

  // Toggle pdf sidebar
  let sidebarBtn = document.querySelector('#sidebarBtn');
  sidebarBtn.addEventListener('click', toggleSidebar);
  function toggleSidebar()
  {
    if (sidebar.classList.contains('sidebar-off'))
    {
      sidebarParent.style.display = 'flex';
      sidebar.classList.replace('sidebar-off', 'sidebar-on');
      pdfContainer.style.alignItems = 'flex-start';

    } else if (sidebar.classList.contains('sidebar-on'))
    {
      sidebarParent.style.display = 'none';
      pdfContainer.style.alignItems = 'center';
      sidebar.classList.replace('sidebar-on', 'sidebar-off');
    }

    updateSidebarPage(pageCounter.value);
  }

  // Controll page counter input on blur and enter key press
  pageCounter.addEventListener('focus', (e) =>
  {
    prevPageNum = e.target.value;
  });

  pageCounter.addEventListener('keyup', (e) =>
  {
    if (e.key === 'Enter' || e.keyCode === 13)
    {
      if (e.target.value > pdfModule.allPages || e.target.value < 1)
      {
        e.target.value = (prevPageNum == undefined ? 1 : prevPageNum);
      } else if (e.target.value != prevPageNum)
      {
        goToPage(e.target.value);
        prevPageNum = e.target.value;
      }
    }
  });

  pageCounter.addEventListener('blur', (e) =>
  {
    if (e.target.value > pdfModule.allPages || e.target.value < 1)
    {
      e.target.value = (prevPageNum == undefined ? 1 : prevPageNum);
    } else if (e.target.value != prevPageNum)
    {
      goToPage(e.target.value);
    }
  });

  if (document.querySelector('.temp') != null)
    document.querySelector('.temp').replaceWith(...document.querySelector('.temp').childNodes);
}

export { enableReadingPageUI, checkSearchButtons, checkButtons, updateSidebarPage, updateLocalStorage };