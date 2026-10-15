// Small enhancements; every page works without them.
(function () {
  // On narrow screens the stage rail scrolls sideways; bring the current stage into view.
  var rail = document.querySelector('.rail');
  if (rail) {
    var current = rail.querySelector('.is-current');
    if (current && rail.scrollWidth > rail.clientWidth) {
      rail.scrollLeft = Math.max(0, current.offsetLeft - (rail.clientWidth - current.offsetWidth) / 2);
    }
  }

  // The menu on narrow screens is a native disclosure. Close it once a link is
  // chosen (a link to a section of the same page would otherwise leave it
  // open), when Escape is pressed, and when the page outside it is selected.
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
  }

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

  // A table or figure wider than the screen scrolls inside its own box. Make that
  // box reachable from the keyboard, and name it for screen readers, only when it
  // actually scrolls. Above a figure or output that scrolls, say so.
  var regions = document.querySelectorAll('.table-wrap, .figure-scroll');
  var scrollers = document.querySelectorAll('.figure-scroll, .console-scroll');
  var headings = Array.prototype.slice.call(document.querySelectorAll('main h1, main h2, main h3'));

  // Names each region after its chart title or the heading it sits under, so
  // every region has a distinct name.
  function nameFor(region, used) {
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
  }

  function scrolls(box) {
    return box.scrollWidth > box.clientWidth + 1;
  }

  // The hint repeats what the region's name already says, so it is hidden from
  // screen readers.
  function hintFor(box) {
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
  }

  function update() {
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
      var wide = box.offsetParent !== null && scrolls(box);
      if (wide || box.previousElementSibling && box.previousElementSibling.classList.contains('scroll-hint')) {
        hintFor(box).hidden = !wide;
      }
    }
  }
  update();
  var timer;
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(update, 150);
  });

  // Final-release screenshots are added to the site after it is built. A
  // screenshot whose file is missing hides itself, and a group of screenshots
  // with nothing left to show hides too, so no page shows a broken image.
  function hideShot(img) {
    var figure = img.closest('figure');
    if (figure) figure.hidden = true;
    var node = figure && figure.parentElement;
    while (node) {
      if (node.hasAttribute('data-shot-group') && !node.querySelector('figure:not([hidden])')) {
        node.hidden = true;
      }
      node = node.parentElement;
    }
  }
  var shots = document.querySelectorAll('[data-final-shot] img');
  for (var s = 0; s < shots.length; s++) {
    if (shots[s].complete && shots[s].naturalWidth === 0) {
      hideShot(shots[s]);
    } else {
      shots[s].addEventListener('error', function () { hideShot(this); });
    }
  }

  // Output from runs on a real MongoDB server, saved as text files after the
  // build. Each block appears only once its file has loaded. Files saved by
  // Windows PowerShell may be UTF-16, so the encoding is read from the file.
  var outputs = document.querySelectorAll('[data-evidence]');
  if (!window.fetch || !window.TextDecoder) return;
  Array.prototype.forEach.call(outputs, function (block) {
    fetch(block.getAttribute('data-evidence'), { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('missing');
        return response.arrayBuffer();
      })
      .then(function (buffer) {
        var bytes = new Uint8Array(buffer);
        var encoding = bytes[0] === 0xFF && bytes[1] === 0xFE ? 'utf-16le'
          : bytes[0] === 0xFE && bytes[1] === 0xFF ? 'utf-16be' : 'utf-8';
        var text = new TextDecoder(encoding).decode(buffer).replace(/\r\n/g, '\n').trim();
        if (!text) return;
        block.querySelector('code').textContent = text;
        block.hidden = false;
        update();
      })
      .catch(function () { /* not added yet: the block stays hidden */ });
  });
})();
