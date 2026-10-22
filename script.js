(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- Theme toggle ---------- */
  var themeToggle = document.getElementById('themeToggle');

  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  themeToggle.addEventListener('click', function () {
    var next = currentTheme() === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');

  function setNav(open) {
    navLinks.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  }
  navToggle.addEventListener('click', function () {
    setNav(!navLinks.classList.contains('open'));
  });
  navLinks.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setNav(false);
  });

  /* ---------- Report filters ---------- */
  var report = document.getElementById('report');
  var chips = report.querySelectorAll('.chip');
  var items = report.querySelectorAll('[data-status]');
  var specs = report.querySelectorAll('.spec');
  var emptyState = document.getElementById('emptyState');
  var specOpenState = Array.prototype.map.call(specs, function (s) { return s.open; });

  // Counts come from the markup so they can never drift from the content
  var counts = { all: items.length, passed: 0, running: 0, skipped: 0, failed: 0 };
  items.forEach(function (el) { counts[el.getAttribute('data-status')]++; });
  report.querySelectorAll('[data-count]').forEach(function (b) {
    b.textContent = counts[b.getAttribute('data-count')];
  });

  /* ---------- Terminal run ---------- */
  var terminal = document.getElementById('terminal');
  var command = 'npx playwright test jacob-wood.spec.ts';
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  // One line per file, oldest job first, so the per-file counts add up to the totals below
  var fileLines = Array.prototype.map.call(specs, function (s) {
    var name = s.querySelector('.spec-file').textContent.trim();
    var date = s.querySelector('.spec-date').textContent.trim();
    var n = s.querySelectorAll('[data-status]').length;
    return '  <span class="ok">✓</span> ' + name + ' <span class="dim">' + plural(n, 'test') + ' · ' + date + '</span>';
  }).reverse();

  var skillPills = report.querySelectorAll('#skills [data-status]');
  var skillsRunning = report.querySelectorAll('#skills [data-status="running"]').length;
  fileLines.push('  <span class="ok">✓</span> skills.spec.ts <span class="dim">' + plural(skillPills.length, 'test') +
    (skillsRunning ? ' · ' + skillsRunning + ' running' : '') + '</span>');
  fileLines.push('  <span class="dim">- hobbies.spec.ts ' + plural(counts.skipped, 'test') + ' · skipped</span>');

  var output = [
    '<span class="dim">Running ' + counts.all + ' tests across ' + fileLines.length + ' files using 1 worker</span>',
    ''
  ].concat(fileLines, [
    '',
    '  <span class="run">' + counts.running + ' running</span>',
    '  <span class="dim">' + counts.skipped + ' skipped</span>',
    '  <span class="sum">' + counts.passed + ' passed</span> <span class="dim">(16y)</span>',
    '<span class="dim">  Serving HTML report below ↓</span>'
  ]);
  var promptHtml = '<span class="prompt">❯</span> ';

  function renderFinal() {
    terminal.innerHTML = promptHtml + command + '\n' + output.join('\n') + '\n' + promptHtml + '<span class="caret"></span>';
    terminal.setAttribute('data-done', 'true');
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    renderFinal();
  } else {
    var typed = 0;
    var shown = 0;
    var typeCommand = function () {
      typed++;
      terminal.innerHTML = promptHtml + command.slice(0, typed) + '<span class="caret"></span>';
      if (typed < command.length) setTimeout(typeCommand, 35 + Math.random() * 40);
      else setTimeout(streamOutput, 450);
    };
    var streamOutput = function () {
      shown++;
      if (shown > output.length) return renderFinal();
      terminal.innerHTML = promptHtml + command + '\n' + output.slice(0, shown).join('\n') + '<span class="caret"></span>';
      setTimeout(streamOutput, shown < 2 ? 500 : 220);
    };
    setTimeout(typeCommand, 400);
  }

  function applyFilter(filter) {
    chips.forEach(function (c) {
      var on = c.getAttribute('data-filter') === filter;
      c.classList.toggle('active', on);
      c.setAttribute('aria-pressed', String(on));
    });

    items.forEach(function (el) {
      el.classList.toggle('is-hidden', filter !== 'all' && el.getAttribute('data-status') !== filter);
    });

    // Hide any container left with no visible results
    report.querySelectorAll('.spec, .suite, .skip-block, #skills').forEach(function (box) {
      if (filter === 'all') return box.classList.remove('is-hidden');
      var visible = box.querySelectorAll('[data-status]:not(.is-hidden)').length;
      box.classList.toggle('is-hidden', visible === 0);
    });

    // Expand matching specs while filtering, restore the original state on "All"
    specs.forEach(function (s, i) { s.open = filter === 'all' ? specOpenState[i] : true; });

    emptyState.hidden = counts[filter] !== 0;
    if (!emptyState.hidden) {
      emptyState.textContent = 'No ' + filter + ' tests found. Nothing to see here.';
    }
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () { applyFilter(chip.getAttribute('data-filter')); });
  });

  /* ---------- Print: expand everything ---------- */
  var printOpenState = [];
  window.addEventListener('beforeprint', function () {
    printOpenState = Array.prototype.map.call(specs, function (s) { return s.open; });
    specs.forEach(function (s) { s.open = true; });
  });
  window.addEventListener('afterprint', function () {
    specs.forEach(function (s, i) { s.open = printOpenState[i]; });
  });
})();
