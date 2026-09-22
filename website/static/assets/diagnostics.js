(function () {
  var PAGES = [
    { id: 'index', path: '/', label: 'Home', desc: 'Standard GTM in <head> after dataLayer push', expectBodyBeforeGtm: false },
    { id: 'standard-head', path: '/standard-head', label: '1. Standard <head>', desc: 'Standard GTM snippet in <head> after dataLayer push', expectBodyBeforeGtm: false },
    { id: 'standard-body-end', path: '/standard-body-end', label: '2. Standard <body>', desc: 'Standard GTM snippet at the bottom of <body> after dataLayer pushes', expectBodyBeforeGtm: true },
    { id: 'retagged-head', path: '/retagged-head', label: '3. Retagged <head>', desc: 'Retagged 1st-party snippet (/d4t4/?id=) in <head> after dataLayer push', expectBodyBeforeGtm: false },
    { id: 'retagged-first-party', path: '/retagged-first-party', label: '4. Retagged <body>', desc: 'Retagged 1st-party snippet (/d4t4/?id=) at bottom of <body> after dataLayer pushes', expectBodyBeforeGtm: true },
    { id: 'dynamic-broken', path: '/dynamic-broken', label: '5. Dynamic JS (Broken)', desc: 'JS-variable URL construction at bottom of <body>', expectBodyBeforeGtm: true },
    { id: 'no-tag', path: '/no-tag', label: '6. No Tag', desc: 'No GTM snippet in HTML at all (tests if Cloudflare still injects GTM)', expectBodyBeforeGtm: true },
    { id: 'direct-script-tag', path: '/direct-script-tag', label: '7. Direct <script>', desc: 'Direct <script async src="/d4t4/"> at bottom of <body>', expectBodyBeforeGtm: true }
  ];

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function render() {
    var root = document.getElementById('diagnostic-app');
    if (!root) return;

    var scenarioId = window.__PAGE_SCENARIO__ || 'index';
    var page = PAGES.find(function (p) { return p.id === scenarioId; }) || PAGES[0];

    var dl = window.dataLayer || [];
    var cfInjectIdx = -1;
    var headIdx = -1;
    var bodyIdx = -1;
    var gtmStartIdx = -1;

    for (var i = 0; i < dl.length; i++) {
      var item = dl[i];
      if (!item) continue;
      var str = JSON.stringify(item);
      if (str.indexOf('developer_id.dY2E1Nz') !== -1 && cfInjectIdx === -1) cfInjectIdx = i;
      if (item.event === 'pre_gtm_head_init' && headIdx === -1) headIdx = i;
      if (item.event === 'pre_gtm_body_init' && bodyIdx === -1) bodyIdx = i;
      if ((item.event === 'gtm.js' || item['gtm.start']) && gtmStartIdx === -1) gtmStartIdx = i;
    }

    var cfInjectedBeforeHead = cfInjectIdx !== -1 && (headIdx === -1 || cfInjectIdx < headIdx);
    var gtmStartAfterDataLayer = gtmStartIdx !== -1 && gtmStartIdx > headIdx && (!page.expectBodyBeforeGtm || gtmStartIdx > bodyIdx);

    var statusClass = cfInjectedBeforeHead ? 'fail' : (gtmStartAfterDataLayer ? 'pass' : 'warn');
    var headline = '';
    var reason = '';

    if (cfInjectedBeforeHead) {
      headline = '⚠️ Cloudflare Injected /d4t4/ at Top of <head> (dataLayer[' + cfInjectIdx + ']) BEFORE Page dataLayer (dataLayer[' + headIdx + '])!';
      if (gtmStartIdx === -1) {
        reason = 'Even with "Setup tag" OFF and no GTM snippet on the page, Cloudflare injected j.src="/d4t4/" at the very top of <head>, loading the GTM container before your dataLayer scripts.';
      } else if (gtmStartAfterDataLayer) {
        reason = 'Cloudflare injected j.src="/d4t4/" at byte 0 of <head> (dataLayer[' + cfInjectIdx + ']) BEFORE your dataLayer init (dataLayer[' + headIdx + ']), while the gtm.js start event fired at your HTML snippet position (dataLayer[' + gtmStartIdx + ']).';
      } else {
        reason = 'Both Cloudflare injection (dataLayer[' + cfInjectIdx + ']) and gtm.js start (dataLayer[' + gtmStartIdx + ']) ran before your expected dataLayer pushes.';
      }
    } else if (gtmStartAfterDataLayer) {
      headline = '✅ PASS: dataLayer loaded BEFORE GTM';
      reason = 'No script was injected before <head> dataLayer, and GTM started at dataLayer[' + gtmStartIdx + '].';
    } else {
      headline = '⚪ No GTM Loaded';
      reason = 'Neither Cloudflare nor the page loaded GTM.';
    }

    var scripts = Array.prototype.slice.call(document.querySelectorAll('script[src]')).map(function (s) {
      return s.getAttribute('src');
    }).filter(function (src) {
      return src.indexOf('diagnostics.js') === -1;
    });

    var navHtml = '<nav>' + PAGES.map(function (p) {
      return '<a href="' + p.path + '" class="' + (p.id === page.id ? 'active' : '') + '">' + esc(p.label) + '</a>';
    }).join('') + '</nav>';

    var dlItemsHtml = dl.map(function (entry, idx) {
      var s = JSON.stringify(entry);
      var isCf = s.indexOf('developer_id.dY2E1Nz') !== -1;
      var isGtm = entry && (entry.event === 'gtm.js' || entry['gtm.start']);
      var isPre = entry && (entry.event === 'pre_gtm_head_init' || entry.event === 'pre_gtm_body_init');
      var cls = isCf ? 'is-gtm' : (isGtm ? 'is-gtm' : (isPre ? 'is-pre' : ''));
      var tag = isCf ? '  <-- INJECTED BY CLOUDFLARE AT TOP OF <head>!' : (isGtm ? '  <-- ON-PAGE GTM SNIPPET (gtm.js)' : (isPre ? '  <-- PAGE DATALAYER PUSH' : ''));
      return '<li class="' + cls + '">[' + idx + '] ' + esc(s) + esc(tag) + '</li>';
    }).join('');

    root.innerHTML =
      '<div class="wrap">' +
        navHtml +
        '<h1>' + esc(page.label) + '</h1>' +
        '<p class="subtitle">' + esc(page.desc) + '</p>' +
        '<div class="result-card ' + statusClass + '">' +
          '<div class="status-headline">' + esc(headline) + '</div>' +
          '<ul class="meta-list">' +
            '<li>' + esc(reason) + '</li>' +
            '<li><strong>Execution Order:</strong> <code>Cloudflare &lt;head&gt; inject = [' + (cfInjectIdx === -1 ? 'none' : cfInjectIdx) + ']</code> &rarr; <code>&lt;head&gt; push = [' + headIdx + ']</code> &rarr; <code>&lt;body&gt; push = [' + bodyIdx + ']</code> &rarr; <code>gtm.js event = [' + (gtmStartIdx === -1 ? 'none' : gtmStartIdx) + ']</code></li>' +
            '<li><strong>Script tags in DOM:</strong> <code>' + (scripts.length ? esc(scripts.join(' , ')) : 'none') + '</code></li>' +
          '</ul>' +
        '</div>' +
        '<div class="box">' +
          '<h2>window.dataLayer (in execution order)</h2>' +
          '<ol class="dl-list" start="0">' + dlItemsHtml + '</ol>' +
        '</div>' +
      '</div>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      render();
      setTimeout(render, 1000);
    });
  } else {
    render();
    setTimeout(render, 1000);
  }
})();
