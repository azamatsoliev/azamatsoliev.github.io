/*
 * Azamat Soliev · CS 499 Computer Science Capstone ePortfolio
 * Site behaviors. Each one is a small enhancement: every page works without them.
 */
(function () {
  'use strict';

  // ----- Menu (narrow screens) -----
  // The menu is a native disclosure. Close it once a link is chosen (a link to
  // a section of the same page would otherwise leave it open), when Escape is
  // pressed, when the page outside it is selected, and when the window becomes
  // wide enough to show the full navigation instead.
  var menu = document.querySelector('.menu');
  if (menu) {
    var summary = menu.querySelector('summary');
    menu.addEventListener('click', function (event) {
      if (event.target.closest('a')) menu.open = false;
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        summary.focus();
      }
    });
    document.addEventListener('click', function (event) {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
    var wide = window.matchMedia('(min-width: 75rem)');
    if (wide.addEventListener) {
      wide.addEventListener('change', function () {
        if (wide.matches) menu.open = false;
      });
    }
  }

  // ----- Contents: mark the section being read -----
  // The section whose heading has most recently passed under the header is the
  // one being read. At the very bottom of the page the last section counts.
  var contents = document.querySelector('.toc');
  if (contents) {
    var tocLinks = Array.prototype.slice.call(contents.querySelectorAll('a[href^="#"]'));
    var sections = tocLinks.map(function (link) {
      return document.getElementById(decodeURIComponent(link.hash.slice(1)));
    });
    var activeLink = null;
    var pending = false;

    var markCurrent = function () {
      pending = false;
      var offset = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 80) + 8;
      var index = -1;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i] && sections[i].getBoundingClientRect().top - offset <= 0) index = i;
      }
      var root = document.documentElement;
      if (index >= 0 && window.innerHeight + window.pageYOffset >= root.scrollHeight - 2) {
        index = sections.length - 1;
      }
      var link = index >= 0 ? tocLinks[index] : null;
      if (link === activeLink) return;
      if (activeLink) {
        activeLink.classList.remove('is-active');
        activeLink.removeAttribute('aria-current');
      }
      if (link) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'true');
      }
      activeLink = link;
    };

    window.addEventListener('scroll', function () {
      if (!pending) {
        pending = true;
        window.requestAnimationFrame(markCurrent);
      }
    }, { passive: true });
    window.addEventListener('resize', markCurrent);
    markCurrent();
  }

  // ----- Tables shown as cards on phones -----
  // On phones, tables are restyled as stacks of cards. Some browsers stop
  // treating a restyled table as a table, so its roles are stated explicitly
  // and screen readers keep announcing each cell with its column heading.
  var roles = { TABLE: 'table', THEAD: 'rowgroup', TBODY: 'rowgroup', TR: 'row', TD: 'cell' };
  Array.prototype.forEach.call(document.querySelectorAll('table.stack, table.stack *'), function (node) {
    if (node.tagName === 'TH') {
      node.setAttribute('role', node.getAttribute('scope') === 'row' ? 'rowheader' : 'columnheader');
    } else if (roles[node.tagName]) {
      node.setAttribute('role', roles[node.tagName]);
    }
  });

  // ----- Content wider than the screen -----
  // A table or figure wider than the screen scrolls inside its own box. Make
  // that box reachable from the keyboard, and name it for screen readers, only
  // when it actually scrolls. Above a figure or output that scrolls, say so.
  var regions = document.querySelectorAll('.table-wrap, .figure-scroll');
  var scrollers = document.querySelectorAll('.figure-scroll, .console-scroll');
  var headings = Array.prototype.slice.call(document.querySelectorAll('main h1, main h2, main h3'));

  // Names each region after its chart title or the heading it sits under, so
  // every region has a distinct name.
  var nameFor = function (region, used) {
    var title = region.querySelector('svg title');
    var base = title ? title.textContent : '';
    if (!base) {
      for (var i = headings.length - 1; i >= 0; i--) {
        if (headings[i].compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING) {
          base = 'Table under ' + headings[i].textContent;
          break;
        }
      }
    }
    base = (base || 'Table') + ', scrolls sideways';
    var name = base;
    for (var n = 2; used[name]; n++) name = base + ' (' + n + ')';
    used[name] = true;
    return name;
  };

  var scrolls = function (box) {
    return box.scrollWidth > box.clientWidth + 1;
  };

  // The hint repeats what the region's name already says, so it is hidden from
  // screen readers.
  var hintFor = function (box) {
    var hint = box.previousElementSibling;
    if (!hint || !hint.classList.contains('scroll-hint')) {
      hint = document.createElement('p');
      hint.className = 'scroll-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = box.classList.contains('console-scroll')
        ? 'Scroll sideways to read each full line →'
        : 'Scroll sideways to see the whole figure →';
      hint.hidden = true;
      box.parentNode.insertBefore(hint, box);
    }
    return hint;
  };

  var update = function () {
    var used = {};
    for (var i = 0; i < regions.length; i++) {
      var region = regions[i];
      if (scrolls(region)) {
        region.setAttribute('tabindex', '0');
        region.setAttribute('role', 'region');
        region.setAttribute('aria-label', nameFor(region, used));
      } else if (region.hasAttribute('tabindex')) {
        region.removeAttribute('tabindex');
        region.removeAttribute('role');
        region.removeAttribute('aria-label');
      }
    }
    for (var j = 0; j < scrollers.length; j++) {
      var box = scrollers[j];
      var isWide = box.offsetParent !== null && scrolls(box);
      if (isWide || (box.previousElementSibling && box.previousElementSibling.classList.contains('scroll-hint'))) {
        hintFor(box).hidden = !isWide;
      }
    }
  };
  update();
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(update, 150);
  });

  // ----- Screenshot viewer -----
  // A screenshot opens over the page instead of replacing it. Without this
  // script, or with a modified click, the link still opens the image file.
  var shotLinks = document.querySelectorAll('.shot-link');
  if (shotLinks.length && typeof HTMLDialogElement === 'function') {
    var viewer = document.createElement('dialog');
    viewer.className = 'viewer';
    viewer.setAttribute('aria-labelledby', 'viewer-caption');
    viewer.innerHTML =
      '<div class="viewer-bar">' +
        '<p class="viewer-caption" id="viewer-caption"></p>' +
        '<a class="viewer-open" target="_blank" rel="noopener">Open full size</a>' +
        '<button class="viewer-close" type="button" aria-label="Close">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="viewer-body" tabindex="0"><img alt=""></div>';
    document.body.appendChild(viewer);

    var viewerImage = viewer.querySelector('img');
    var viewerCaption = viewer.querySelector('.viewer-caption');
    var viewerOpen = viewer.querySelector('.viewer-open');
    var viewerBody = viewer.querySelector('.viewer-body');
    var viewerClose = viewer.querySelector('.viewer-close');
    var opener = null;

    // The figure's caption, without the "select the image" hint.
    var captionFor = function (link) {
      var figure = link.closest('figure');
      var caption = figure && figure.querySelector('figcaption');
      if (!caption) return '';
      var copy = caption.cloneNode(true);
      var hint = copy.querySelector('.shot-hint');
      if (hint) hint.parentNode.removeChild(hint);
      return copy.textContent.replace(/\s+/g, ' ').trim();
    };

    Array.prototype.forEach.call(shotLinks, function (link) {
      link.addEventListener('click', function (event) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        var thumb = link.querySelector('img');
        opener = link;
        viewerImage.src = link.getAttribute('href');
        viewerImage.alt = thumb ? thumb.alt : '';
        viewerCaption.textContent = captionFor(link) || viewerImage.alt;
        viewerOpen.href = link.getAttribute('href');
        viewer.showModal();
        viewerBody.scrollTop = 0;
        viewerClose.focus();
      });
    });

    viewerClose.addEventListener('click', function () { viewer.close(); });
    // A click on the dimmed backdrop lands on the dialog itself.
    viewer.addEventListener('click', function (event) {
      if (event.target === viewer) viewer.close();
    });
    viewer.addEventListener('close', function () {
      viewerImage.removeAttribute('src');
      if (opener) opener.focus();
      opener = null;
    });
  }
})();
