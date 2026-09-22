(function () {
  var PAGES = [
    { id: 'index', path: '/', label: 'Home', desc: 'Standard GTM in <head> after dataLayer push', expectBodyBeforeGtm: false },
    { id: 'standard-head', path: '/standard-head', label: '1. Standard <head>', desc: 'Standard GTM snippet in <head> after dataLayer push', expectBodyBeforeGtm: false },
    { id: 'standard-body-end', path: '/standard-body-end', label: '2. Standard <body>', desc: 'Standard GTM snippet at the bottom of <body> after dataLayer pushes', expectBodyBeforeGtm: true },
    { id: 'retagged-head', path: '/retagged-head', label: '3. Retagged <head>', desc: 'Retagged 1st-party snippet (/d4t4/?id=) in <head> after dataLayer push', expectBodyBeforeGtm: false },
    { id: 'retagged-first-party', path: '/retagged-first-party', label: '4. Retagged <body>', desc: 'Retagged 1st-party snippet (/d4t4/?id=) at bottom of <body> after dataLayer pushes', expectBodyBeforeGtm: true },
    { id: 'dynamic-broken', path: '/dynamic-broken', label: '5. Dynamic JS (Broken)', desc: 'JS-variable URL construction at bottom of <body> (Cloudflare does not recognize it)', expectBodyBeforeGtm: true },
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
    var headIdx = -1;
    var bodyIdx = -1;
    var gtmIdx = -1;

    for (var i = 0; i < dl.length; i++) {
      var item = dl[i];
      if (!item) continue;
      if (item.event === 'pre_gtm_head_init' && headIdx === -1) headIdx = i;
      if (item.event === 'pre_gtm_body_init' && bodyIdx === -1) bodyIdx = i;
      if ((item.event === 'gtm.js' || item['gtm.start'] || item.event === 'gtm.init') && gtmIdx === -1) gtmIdx = i;
    }

    var headSnap = window.__HEAD_SNAPSHOT__ || {};
    var bodySnap = window.__BODY_SNAPSHOT__ || {};

    // Check if GTM loaded before the expected dataLayer push
    var gtmRanBeforeHead = headSnap.gtmAlreadyStartedBeforeHeadPush || (gtmIdx !== -1 && gtmIdx < headIdx);
    var gtmRanBeforeBody = page.expectBodyBeforeGtm && (bodySnap.gtmAlreadyStartedBeforeBodyPush || (gtmIdx !== -1 && gtmIdx < bodyIdx));

    var statusClass = 'pass';
    var headline = '✅ PASS: dataLayer loaded BEFORE GTM';
    var reason = 'GTM executed at the expected position in the HTML after the dataLayer was populated.';

    if (gtmIdx === -1) {
      statusClass = 'warn';
      headline = '⚪ NO GTM LOADED';
      reason = 'No GTM script ran on this page.';
    } else if (gtmRanBeforeHead) {
      statusClass = 'fail';
      headline = '❌ FAIL: Cloudflare injected GTM at top of <head> BEFORE dataLayer!';
      reason = 'GTM initialized at dataLayer[' + gtmIdx + '], before the <head> dataLayer push at dataLayer[' + headIdx + '].';
    } else if (gtmRanBeforeBody) {
      statusClass = 'fail';
      headline = '❌ FAIL: GTM ran in <head> BEFORE the <body> dataLayer push!';
      reason = 'Origin placed GTM at the bottom of <body>, but GTM initialized at dataLayer[' + gtmIdx + '] before <body> push at dataLayer[' + bodyIdx + '].';
    }

    // Find loaded GTM script URL(s)
    var scripts = [];
    if (window.performance && window.performance.getEntriesByType) {
      scripts = (window.performance.getEntriesByType('resource') || [])
        .filter(function (r) {
          return r.name &&
            r.name.indexOf('diagnostics.js') === -1 &&
            r.name.indexOf('styles.css') === -1 &&
            r.name.indexOf('/raw-origin/') === -1 &&
            (r.initiatorType === 'script' || r.name.indexOf('gtm.js') !== -1 || r.name.indexOf('?id=') !== -1);
        })
        .map(function (r) { return r.name; });
    }

    var cb = (window.__GTM_CALLBACK_DATA__ || [])[0];
    var gtmCallbackLine = cb
      ? '<li><strong>Read by GTM Tag on Load:</strong> head=<code>' + esc(cb.headTokenReadByGtm || 'undefined') + '</code>, body=<code>' + esc(cb.bodyTokenReadByGtm || 'undefined') + '</code></li>'
      : '';

    var navHtml = '<nav>' + PAGES.map(function (p) {
      return '<a href="' + p.path + '" class="' + (p.id === page.id ? 'active' : '') + '">' + esc(p.label) + '</a>';
    }).join('') + '</nav>';

    var dlItemsHtml = dl.map(function (entry, idx) {
      var isGtm = entry && (entry.event === 'gtm.js' || entry['gtm.start'] || entry.event === 'gtm.init');
      var isPre = entry && (entry.event === 'pre_gtm_head_init' || entry.event === 'pre_gtm_body_init');
      var cls = isGtm ? 'is-gtm' : (isPre ? 'is-pre' : '');
      return '<li class="' + cls + '">[' + idx + '] ' + esc(JSON.stringify(entry)) + '</li>';
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
            '<li><strong>Order in dataLayer:</strong> <code>&lt;head&gt; push = [' + headIdx + ']</code> &rarr; <code>&lt;body&gt; push = [' + bodyIdx + ']</code> &rarr; <code>GTM start = [' + (gtmIdx === -1 ? 'none' : gtmIdx) + ']</code></li>' +
            '<li><strong>Script URL loaded:</strong> <code>' + (scripts.length ? esc(scripts.join(', ')) : 'none') + '</code></li>' +
            gtmCallbackLine +
          '</ul>' +
        '</div>' +
        '<div class="box">' +
          '<h2>window.dataLayer (in execution order)</h2>' +
          '<ol class="dl-list" start="0">' + dlItemsHtml + '</ol>' +
        '</div>' +
      '</div>';
  }

  window.addEventListener('gtm-verification-fired', render);
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
