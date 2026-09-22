(function () {
  var SCENARIOS = [
    {
      id: 'index',
      path: '/',
      rawFile: '/raw-origin/index.txt',
      title: 'Test Suite Hub & Baseline (<head> Standard)',
      placement: 'In <head> AFTER #dl-head-init',
      construction: "Standard IIFE ('https://www.googletagmanager.com/gtm.js?id='+i+dl)",
      expectHeadBeforeGtm: true,
      expectBodyBeforeGtm: false,
      summary: 'Overview dashboard + baseline test with standard GTM snippet in <head> after dataLayer push.'
    },
    {
      id: 'standard-head',
      path: '/standard-head',
      rawFile: '/raw-origin/standard-head.txt',
      title: '1. Standard GTM in <head> (After dataLayer)',
      placement: 'In <head> AFTER #dl-head-init',
      construction: "Standard IIFE ('https://www.googletagmanager.com/gtm.js?id='+i+dl)",
      expectHeadBeforeGtm: true,
      expectBodyBeforeGtm: false,
      summary: 'Official GTM snippet in <head> placed right after dataLayer initialization. Tests if Cloudflare rewrites in-place after #dl-head-init.'
    },
    {
      id: 'standard-body-end',
      path: '/standard-body-end',
      rawFile: '/raw-origin/standard-body-end.txt',
      title: '2. Standard GTM at Bottom of <body>',
      placement: 'Bottom of <body> AFTER #dl-head-init & #dl-body-init',
      construction: "Standard IIFE ('https://www.googletagmanager.com/gtm.js?id='+i+dl)",
      expectHeadBeforeGtm: true,
      expectBodyBeforeGtm: true,
      summary: 'Official GTM snippet placed at the very end of <body> after both <head> and <body> dataLayer pushes. Tests whether Cloudflare rewrites in-place at body end or injects into <head>.'
    },
    {
      id: 'retagged-head',
      path: '/retagged-head',
      rawFile: '/raw-origin/retagged-head.txt',
      title: '3. Retagged 1st-Party GTM in <head>',
      placement: 'In <head> AFTER #dl-head-init',
      construction: "First-Party Retagged IIFE ('/__MEASUREMENT_PATH__/gtm.js?id='+i+dl)",
      expectHeadBeforeGtm: true,
      expectBodyBeforeGtm: false,
      summary: 'Explicitly retagged to load from the first-party measurement path in <head> after #dl-head-init.'
    },
    {
      id: 'retagged-first-party',
      path: '/retagged-first-party',
      rawFile: '/raw-origin/retagged-first-party.txt',
      title: '4. Retagged 1st-Party GTM at Bottom of <body>',
      placement: 'Bottom of <body> AFTER #dl-head-init & #dl-body-init',
      construction: "First-Party Retagged IIFE ('/__MEASUREMENT_PATH__/gtm.js?id='+i+dl)",
      expectHeadBeforeGtm: true,
      expectBodyBeforeGtm: true,
      summary: 'Explicitly retagged to load from the first-party measurement path at the very bottom of <body>. Proves that when properly retagged, GTM loads strictly where placed after all dataLayer pushes.'
    },
    {
      id: 'dynamic-broken',
      path: '/dynamic-broken',
      rawFile: '/raw-origin/dynamic-broken.txt',
      title: '5. Improperly Constructed / Dynamic JS URL',
      placement: 'Bottom of <body> (Dynamic JS Concatenation)',
      construction: 'Non-standard JS variable URL (base + "/gtm.js?id=" + i)',
      expectHeadBeforeGtm: true,
      expectBodyBeforeGtm: true,
      summary: 'Reproduces the old index.html construction where j.src is built via runtime JS variables. Proves Cloudflare does not recognize the tag and auto-injects at the top of <head> BEFORE dataLayer!'
    },
    {
      id: 'no-tag',
      path: '/no-tag',
      rawFile: '/raw-origin/no-tag.txt',
      title: '6. No GTM Snippet in Origin HTML',
      placement: 'None (Zero GTM tags in Origin HTML)',
      construction: 'No GTM snippet present in origin HTML',
      expectHeadBeforeGtm: true,
      expectBodyBeforeGtm: true,
      summary: 'Origin HTML only populates window.dataLayer and has NO GTM snippet at all. Tests whether Cloudflare GTG still injects the script into <head> with the UI toggle off vs on.'
    },
    {
      id: 'direct-script-tag',
      path: '/direct-script-tag',
      rawFile: '/raw-origin/direct-script-tag.txt',
      title: '7. Direct <script async src="..."> at Bottom of <body>',
      placement: 'Bottom of <body> (Literal <script src> tag)',
      construction: '<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-KDFCRJM5">',
      expectHeadBeforeGtm: true,
      expectBodyBeforeGtm: true,
      summary: 'Uses a literal <script async src="..."> element at the bottom of <body> instead of the IIFE insertBefore pattern, keeping the <script> DOM node physically in <body>.'
    }
  ];

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getCurrentScenario() {
    var scenarioId = window.__PAGE_SCENARIO__ || 'index';
    for (var i = 0; i < SCENARIOS.length; i++) {
      if (SCENARIOS[i].id === scenarioId) return SCENARIOS[i];
    }
    return SCENARIOS[0];
  }

  function analyzeDataLayer() {
    var dl = window.dataLayer || [];
    var headPushIndex = -1;
    var bodyPushIndex = -1;
    var firstGtmStartIndex = -1;
    var allGtmStartIndices = [];
    var gtmCallbacks = (window.__GTM_CALLBACK_DATA__ || []).slice();

    for (var i = 0; i < dl.length; i++) {
      var item = dl[i];
      if (!item || typeof item !== 'object') continue;
      if (item.event === 'pre_gtm_head_init' && headPushIndex === -1) {
        headPushIndex = i;
      }
      if (item.event === 'pre_gtm_body_init' && bodyPushIndex === -1) {
        bodyPushIndex = i;
      }
      if (item.event === 'gtm.js' || item['gtm.start']) {
        if (firstGtmStartIndex === -1) firstGtmStartIndex = i;
        allGtmStartIndices.push(i);
      }
      if (item.event === 'gtm_verification_callback') {
        gtmCallbacks.push(item);
      }
    }

    return {
      dl: dl,
      headPushIndex: headPushIndex,
      bodyPushIndex: bodyPushIndex,
      firstGtmStartIndex: firstGtmStartIndex,
      allGtmStartIndices: allGtmStartIndices,
      gtmCallbacks: gtmCallbacks
    };
  }

  function getLoadedGtmResources() {
    if (!window.performance || !window.performance.getEntriesByType) return [];
    var resources = window.performance.getEntriesByType('resource') || [];
    return resources.filter(function (r) {
      return r.name && (r.name.indexOf('gtm.js') !== -1 || r.name.indexOf('gtag/js') !== -1);
    });
  }

  function extractScriptTagsFromHtml(rawHtml) {
    if (!rawHtml) return [];
    var regex = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
    var matches = rawHtml.match(regex) || [];
    return matches.map(function (tag, idx) {
      var idMatch = tag.match(/\bid=["']([^"']+)["']/i);
      var srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
      var originMatch = tag.match(/\bdata-origin-script=["']([^"']+)["']/i);
      return {
        index: idx,
        id: idMatch ? idMatch[1] : null,
        src: srcMatch ? srcMatch[1] : null,
        originTag: originMatch ? originMatch[1] : null,
        raw: tag.trim()
      };
    });
  }

  var wireComparisonState = {
    loading: true,
    originHtml: null,
    edgeHtml: null,
    originScripts: [],
    edgeScripts: [],
    edgeInjectedTopOfHead: false,
    edgeRewroteInPlace: false,
    edgeModifiedAny: false,
    error: null
  };

  function fetchWireComparison(scenario, callback) {
    var edgePromise = fetch(window.location.pathname + window.location.search, {
      headers: { Accept: 'text/html' },
      cache: 'no-store'
    }).then(function (r) { return r.text(); });

    var originPromise = fetch(scenario.rawFile, {
      cache: 'no-store'
    }).then(function (r) { return r.ok ? r.text() : null; });

    Promise.all([originPromise, edgePromise])
      .then(function (results) {
        var originHtml = results[0];
        var edgeHtml = results[1];
        var originScripts = extractScriptTagsFromHtml(originHtml);
        var edgeScripts = extractScriptTagsFromHtml(edgeHtml);

        var edgeModifiedAny = originHtml && edgeHtml && originHtml.trim() !== edgeHtml.trim();
        var edgeInjectedTopOfHead = false;
        var edgeRewroteInPlace = false;

        if (edgeScripts.length > 0) {
          // Check if the very first script in edge HTML is NOT dl-head-init
          if (edgeScripts[0].id !== 'dl-head-init') {
            edgeInjectedTopOfHead = true;
          }
          // Check if edgeScripts has more scripts than originScripts
          if (originScripts.length > 0 && edgeScripts.length > originScripts.length) {
            // See if any new script appeared before dl-head-init
            var dlHeadIdxInEdge = -1;
            for (var i = 0; i < edgeScripts.length; i++) {
              if (edgeScripts[i].id === 'dl-head-init') {
                dlHeadIdxInEdge = i;
                break;
              }
            }
            if (dlHeadIdxInEdge > 0) {
              edgeInjectedTopOfHead = true;
            }
          }
          // Check if origin-gtm-snippet or origin-gtm-direct was rewritten in-place
          for (var j = 0; j < originScripts.length; j++) {
            var origS = originScripts[j];
            if (origS.id === 'origin-gtm-snippet' || origS.id === 'origin-gtm-direct') {
              var matchingEdge = edgeScripts.find(function (es) { return es.id === origS.id; });
              if (matchingEdge && matchingEdge.raw !== origS.raw) {
                edgeRewroteInPlace = true;
              }
            }
          }
        }

        wireComparisonState = {
          loading: false,
          originHtml: originHtml,
          edgeHtml: edgeHtml,
          originScripts: originScripts,
          edgeScripts: edgeScripts,
          edgeInjectedTopOfHead: edgeInjectedTopOfHead,
          edgeRewroteInPlace: edgeRewroteInPlace,
          edgeModifiedAny: edgeModifiedAny,
          error: null
        };
        callback();
      })
      .catch(function (err) {
        wireComparisonState.loading = false;
        wireComparisonState.error = String(err);
        callback();
      });
  }

  function renderApp() {
    var root = document.getElementById('diagnostic-app');
    if (!root) return;

    var scenario = getCurrentScenario();
    var dlStats = analyzeDataLayer();
    var headSnap = window.__HEAD_SNAPSHOT__ || {};
    var bodySnap = window.__BODY_SNAPSHOT__ || {};
    var gtmResources = getLoadedGtmResources();

    // 1. Determine Verdict 1: Did Cloudflare inject at top of <head> or rewrite in-place?
    var injectedBeforeHeadInit =
      Boolean(headSnap.gtmAlreadyStartedBeforeHeadPush) ||
      (headSnap.scriptsInHeadAtHeadInitTime && headSnap.scriptsInHeadAtHeadInitTime.length > 1) ||
      wireComparisonState.edgeInjectedTopOfHead;

    var injectedInHeadBeforeBodyInit =
      scenario.expectBodyBeforeGtm && Boolean(bodySnap.gtmAlreadyStartedBeforeBodyPush);

    var edgeVerdictClass = 'pass';
    var edgeVerdictTitle = 'NO UNEXPECTED <head> INJECTION';
    var edgeVerdictDesc = 'No script was injected before #dl-head-init in <head>.';

    if (injectedBeforeHeadInit) {
      edgeVerdictClass = 'fail';
      edgeVerdictTitle = 'INJECTED AT TOP OF <head>!';
      edgeVerdictDesc = 'A script was injected at the very top of <head> BEFORE #dl-head-init ran!';
    } else if (injectedInHeadBeforeBodyInit) {
      edgeVerdictClass = 'fail';
      edgeVerdictTitle = 'INJECTED IN <head> BEFORE <body>!';
      edgeVerdictDesc = 'Origin placed GTM at bottom of <body> (or no tag), but GTM executed in <head> before #dl-body-init!';
    } else if (wireComparisonState.edgeRewroteInPlace) {
      edgeVerdictClass = 'pass';
      edgeVerdictTitle = 'REWRITTEN IN-PLACE AT EXACT LOCATION';
      edgeVerdictDesc = 'Cloudflare recognized the snippet and rewrote it in-place without moving it!';
    } else if (dlStats.firstGtmStartIndex === -1) {
      edgeVerdictClass = 'warn';
      edgeVerdictTitle = 'NO GTM EXECUTED ON PAGE';
      edgeVerdictDesc = 'Neither origin HTML nor Cloudflare edge executed GTM on this page.';
    }

    // 2. Determine Verdict 2: <head> DataLayer Token (head_pre_load_token)
    var headTokenOk =
      dlStats.headPushIndex !== -1 &&
      (dlStats.firstGtmStartIndex === -1 || dlStats.headPushIndex < dlStats.firstGtmStartIndex) &&
      !headSnap.gtmAlreadyStartedBeforeHeadPush;

    var headVerdictClass = headTokenOk ? 'pass' : 'fail';
    var headVerdictTitle = headTokenOk
      ? 'PASS (Index [' + dlStats.headPushIndex + '] < gtm.js [' + (dlStats.firstGtmStartIndex === -1 ? 'none' : dlStats.firstGtmStartIndex) + '])'
      : 'FAIL (gtm.js [' + dlStats.firstGtmStartIndex + '] ran BEFORE <head> push [' + dlStats.headPushIndex + ']!)';

    // 3. Determine Verdict 3: <body> DataLayer Token (body_pre_load_token)
    var bodyTokenBeforeGtm =
      dlStats.bodyPushIndex !== -1 &&
      (dlStats.firstGtmStartIndex === -1 || dlStats.bodyPushIndex < dlStats.firstGtmStartIndex) &&
      !bodySnap.gtmAlreadyStartedBeforeBodyPush;

    var bodyVerdictClass = 'pass';
    var bodyVerdictTitle = '';
    var bodyVerdictDesc = '';

    if (scenario.expectBodyBeforeGtm) {
      if (bodyTokenBeforeGtm && dlStats.firstGtmStartIndex !== -1) {
        bodyVerdictClass = 'pass';
        bodyVerdictTitle = 'PASS (Index [' + dlStats.bodyPushIndex + '] < gtm.js [' + dlStats.firstGtmStartIndex + '])';
        bodyVerdictDesc = 'Both <head> and <body> dataLayer pushes completed BEFORE gtm.js initialized at bottom of <body>!';
      } else if (dlStats.firstGtmStartIndex === -1) {
        bodyVerdictClass = 'warn';
        bodyVerdictTitle = 'NO GTM LOADED (Body push at [' + dlStats.bodyPushIndex + '])';
        bodyVerdictDesc = 'body_pre_load_token is in dataLayer, and no GTM script was injected.';
      } else {
        bodyVerdictClass = 'fail';
        bodyVerdictTitle = 'FAIL (gtm.js [' + dlStats.firstGtmStartIndex + '] ran BEFORE <body> push [' + dlStats.bodyPushIndex + ']!)';
        bodyVerdictDesc = 'GTM initialized in <head> before the parser reached #dl-body-init in <body>!';
      }
    } else {
      bodyVerdictClass = bodyTokenBeforeGtm ? 'warn' : 'pass';
      bodyVerdictTitle = 'EXPECTED: <head> GTM [' + dlStats.firstGtmStartIndex + '] < <body> [' + dlStats.bodyPushIndex + ']';
      bodyVerdictDesc = 'On this page, GTM is intentionally placed in <head>, so it runs after <head> push [' + dlStats.headPushIndex + '] and before <body> push [' + dlStats.bodyPushIndex + '].';
    }

    // 4. Determine Verdict 4: GTM Script Network Source & Callback
    var loadedUrls = gtmResources.map(function (r) { return r.name; });
    var isFirstParty = loadedUrls.some(function (u) { return u.indexOf('googletagmanager.com') === -1; });
    var sourceClass = loadedUrls.length === 0 ? 'warn' : (loadedUrls.length > 1 ? 'fail' : 'pass');
    var sourceTitle = loadedUrls.length === 0
      ? '0 GTM SCRIPTS LOADED'
      : (loadedUrls.length > 1
          ? 'DUPLICATE GTM SCRIPTS (' + loadedUrls.length + ')!'
          : (isFirstParty ? '1st-PARTY GATEWAY LOADED' : '3rd-PARTY (googletagmanager.com)'));
    var sourceDesc = loadedUrls.length > 0
      ? loadedUrls.map(function (u) { return u.replace(window.location.origin, ''); }).join(' | ')
      : 'No gtm.js network request detected in Resource Timing API.';

    // Build Top Navigation
    var navHtml =
      '<nav class="top-nav"><div class="top-nav-inner">' +
        '<div class="brand">' +
          '<span class="brand-badge">GTG TEST LAB</span>' +
          '<span>nielsoverwijn.dev &middot; <code>GTM-KDFCRJM5</code></span>' +
        '</div>' +
        '<div class="nav-links">' +
          SCENARIOS.map(function (s) {
            var active = s.id === scenario.id ? ' active' : '';
            var label = s.id === 'index' ? '🏠 Hub (/)' : s.path;
            return '<a class="nav-pill' + active + '" href="' + s.path + '">' + escapeHtml(label) + '</a>';
          }).join('') +
        '</div>' +
      '</div></nav>';

    // Build Hero + Scenario Switcher
    var heroHtml =
      '<div class="hero-card">' +
        '<div class="hero-header">' +
          '<div>' +
            '<h1 class="hero-title">' + escapeHtml(scenario.title) + '</h1>' +
            '<p class="hero-subtitle">' + escapeHtml(scenario.summary) + '</p>' +
          '</div>' +
          '<div class="path-badge">Route: ' + escapeHtml(window.location.pathname) + '</div>' +
        '</div>' +
        '<div style="display:flex; flex-wrap:wrap; gap:1rem; font-size:0.84rem; color:var(--text-muted); border-top:1px solid var(--border); padding-top:0.85rem;">' +
          '<div><strong>Origin GTM Placement:</strong> <code>' + escapeHtml(scenario.placement) + '</code></div>' +
          '<div><strong>Snippet Construction:</strong> <code>' + escapeHtml(scenario.construction) + '</code></div>' +
          '<div><strong>Configured Measurement Path:</strong> <code>' + escapeHtml(window.__CONFIGURED_MP__ || '/d4t4') + '</code></div>' +
        '</div>' +
      '</div>';

    // Build 4 Verdict Boxes
    var verdictsHtml =
      '<div class="verdict-grid">' +
        '<div class="verdict-box ' + edgeVerdictClass + '">' +
          '<div class="verdict-label">1. Cloudflare Edge Injection / Position</div>' +
          '<div class="verdict-value">' + escapeHtml(edgeVerdictTitle) + '</div>' +
          '<p class="verdict-desc">' + escapeHtml(edgeVerdictDesc) + '</p>' +
        '</div>' +
        '<div class="verdict-box ' + headVerdictClass + '">' +
          '<div class="verdict-label">2. &lt;head&gt; DataLayer Prior to GTM</div>' +
          '<div class="verdict-value">' + escapeHtml(headVerdictTitle) + '</div>' +
          '<p class="verdict-desc"><code>head_pre_load_token</code> pushed in <code>&lt;head&gt;</code> before origin GTM snippet.</p>' +
        '</div>' +
        '<div class="verdict-box ' + bodyVerdictClass + '">' +
          '<div class="verdict-label">3. &lt;body&gt; DataLayer Prior to GTM</div>' +
          '<div class="verdict-value">' + escapeHtml(bodyVerdictTitle) + '</div>' +
          '<p class="verdict-desc">' + escapeHtml(bodyVerdictDesc) + '</p>' +
        '</div>' +
        '<div class="verdict-box ' + sourceClass + '">' +
          '<div class="verdict-label">4. Network gtm.js Source (' + loadedUrls.length + ' loaded)</div>' +
          '<div class="verdict-value">' + escapeHtml(sourceTitle) + '</div>' +
          '<p class="verdict-desc"><code>' + escapeHtml(sourceDesc) + '</code></p>' +
        '</div>' +
      '</div>';

    // Build GTM Custom HTML Tag Verification Panel
    var callbacks = dlStats.gtmCallbacks;
    var gtmCallbackRows = '';
    if (callbacks.length > 0) {
      gtmCallbackRows = callbacks.map(function (cb, i) {
        return '<tr>' +
          '<td><code>#' + (i + 1) + '</code></td>' +
          '<td><code>' + escapeHtml(cb.triggerEvent || 'gtm.js') + '</code></td>' +
          '<td>' + (cb.headTokenReadByGtm ? '<span class="tag-badge green">' + escapeHtml(cb.headTokenReadByGtm) + '</span>' : '<span class="tag-badge red">undefined (NOT IN DATALAYER YET!)</span>') + '</td>' +
          '<td>' + (cb.bodyTokenReadByGtm ? '<span class="tag-badge green">' + escapeHtml(cb.bodyTokenReadByGtm) + '</span>' : '<span class="tag-badge yellow">undefined</span>') + '</td>' +
          '<td><code>' + escapeHtml(cb.recordedAt || '') + '</code></td>' +
        '</tr>';
      }).join('');
    } else {
      gtmCallbackRows =
        '<tr><td colspan="5" style="color:var(--text-muted);">' +
          'Waiting for GTM Custom HTML Verification Tag on <code>All Pages (gtm.js)</code> in container <code>GTM-KDFCRJM5</code> (or GTM did not fire it yet). Expand instructions below to add this 10-second tag in GTM!' +
        '</td></tr>';
    }

    var gtmSetupTagSnippet =
      '<script>\n' +
      '  window.__GTM_CALLBACK_DATA__ = window.__GTM_CALLBACK_DATA__ || [];\n' +
      '  var payload = {\n' +
      '    event: "gtm_verification_callback",\n' +
      '    triggerEvent: {{Event}},\n' +
      '    headTokenReadByGtm: {{DLV - head_pre_load_token}},\n' +
      '    bodyTokenReadByGtm: {{DLV - body_pre_load_token}},\n' +
      '    recordedAt: new Date().toISOString()\n' +
      '  };\n' +
      '  window.__GTM_CALLBACK_DATA__.push(payload);\n' +
      '  window.dataLayer.push(payload);\n' +
      '  window.dispatchEvent(new CustomEvent("gtm-verification-fired"));\n' +
      '</script>';

    var gtmVerificationPanel =
      '<div class="panel">' +
        '<div class="panel-header">' +
          '<h3 class="panel-title">🎯 Live GTM Trigger &amp; Variable Verification (<code>GTM-KDFCRJM5</code>)</h3>' +
          '<button class="btn btn-secondary" onclick="var el=document.getElementById(\'gtm-setup-guide\'); el.style.display = el.style.display === \'none\' ? \'block\' : \'none\';">⚙️ Show/Hide GTM Trigger &amp; Variable Setup Guide</button>' +
        '</div>' +
        '<div class="panel-body">' +
          '<div class="table-wrap">' +
            '<table>' +
              '<thead><tr><th>#</th><th>GTM Trigger Event</th><th><code>{{DLV - head_pre_load_token}}</code> at GTM Load</th><th><code>{{DLV - body_pre_load_token}}</code> at GTM Load</th><th>Timestamp</th></tr></thead>' +
              '<tbody>' + gtmCallbackRows + '</tbody>' +
            '</table>' +
          '</div>' +
          '<div id="gtm-setup-guide" style="display:none; margin-top:1.25rem; border-top:1px solid var(--border); padding-top:1rem;">' +
            '<h4 style="margin:0 0 0.5rem 0;">How to set up in GTM Container <code>GTM-KDFCRJM5</code> (takes 1 minute):</h4>' +
            '<ol style="margin:0 0 0.75rem 1.25rem; font-size:0.85rem; color:var(--text-muted);">' +
              '<li>In GTM &rarr; <strong>Variables</strong> &rarr; <strong>New User-Defined Variable</strong> (Type: <em>Data Layer Variable</em>):' +
                '<ul>' +
                  '<li>Name: <code>DLV - head_pre_load_token</code> &nbsp;|&nbsp; Data Layer Variable Name: <code>head_pre_load_token</code></li>' +
                  '<li>Name: <code>DLV - body_pre_load_token</code> &nbsp;|&nbsp; Data Layer Variable Name: <code>body_pre_load_token</code></li>' +
                '</ul>' +
              '</li>' +
              '<li>Also enable Built-In Variable: <code>Event</code>.</li>' +
              '<li>In GTM &rarr; <strong>Tags</strong> &rarr; <strong>New</strong> (Type: <em>Custom HTML</em>), Trigger: <strong>All Pages (Page View / gtm.js)</strong>, and paste this HTML:</li>' +
            '</ol>' +
            '<pre class="code-block">' + escapeHtml(gtmSetupTagSnippet) + '</pre>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Build Wire-Level Diff (Origin HTML vs Cloudflare Edge HTML) + Parser Snapshot Panel
    var wireDiffHtml = '';
    if (wireComparisonState.loading) {
      wireDiffHtml = '<p style="color:var(--text-muted);">Comparing untouched Origin HTML (<code>text/plain</code> bypass) with Cloudflare Edge HTML response...</p>';
    } else if (wireComparisonState.error) {
      wireDiffHtml = '<p style="color:var(--warn-text);">Could not fetch wire comparison: ' + escapeHtml(wireComparisonState.error) + '</p>';
    } else {
      var maxLen = Math.max(wireComparisonState.originScripts.length, wireComparisonState.edgeScripts.length);
      var rows = [];
      for (var k = 0; k < maxLen; k++) {
        var os = wireComparisonState.originScripts[k];
        var es = wireComparisonState.edgeScripts[k];
        var isDiff = !os || !es || os.raw !== es.raw;
        rows.push(
          '<tr class="' + (isDiff ? 'highlight-edge' : '') + '">' +
            '<td><code>Script #' + (k + 1) + '</code> ' + (isDiff ? '<span class="tag-badge red">MODIFIED / INJECTED BY EDGE</span>' : '<span class="tag-badge green">IDENTICAL</span>') + '</td>' +
            '<td><pre class="code-block" style="margin:0; max-width:520px; white-space:pre-wrap;">' + (os ? escapeHtml(os.raw) : '<em>(No script at this index in Origin HTML)</em>') + '</pre></td>' +
            '<td><pre class="code-block" style="margin:0; max-width:520px; white-space:pre-wrap;">' + (es ? escapeHtml(es.raw) : '<em>(Missing in Edge HTML)</em>') + '</pre></td>' +
          '</tr>'
        );
      }
      wireDiffHtml =
        '<div style="margin-bottom:0.85rem; font-size:0.85rem; color:var(--text-muted);">' +
          '<strong>How this works:</strong> We fetch the exact same page via <code>' + escapeHtml(scenario.rawFile) + '</code> (served as <code>text/plain</code>, which Cloudflare HTMLRewriter never touches) and compare its <code>&lt;script&gt;</code> tags against the live <code>text/html</code> response delivered through Cloudflare Edge.' +
        '</div>' +
        '<div class="table-wrap">' +
          '<table>' +
            '<thead><tr><th style="width:160px;">Order in HTML</th><th>Origin Server HTML (Cloud Run Untouched)</th><th>Cloudflare Edge HTML (Delivered Over the Wire)</th></tr></thead>' +
            '<tbody>' + rows.join('') + '</tbody>' +
          '</table>' +
        '</div>';
    }

    var wirePanel =
      '<div class="panel">' +
        '<div class="panel-header">' +
          '<h3 class="panel-title">🔬 Wire-Level HTML Diff: Origin HTML vs. Cloudflare Edge HTML</h3>' +
          (wireComparisonState.edgeModifiedAny
            ? '<span class="tag-badge yellow">CLOUDFLARE MODIFIED THE HTML STREAM</span>'
            : '<span class="tag-badge blue">ORIGIN &amp; EDGE HTML ARE IDENTICAL</span>') +
        '</div>' +
        '<div class="panel-body">' + wireDiffHtml + '</div>' +
      '</div>';

    // Build Live window.dataLayer Table & Synchronous Parser Snapshots Side-by-Side
    var dlRows = dlStats.dl.map(function (entry, idx) {
      var evName = entry && entry.event ? entry.event : (entry && entry['gtm.start'] ? 'gtm.js (gtm.start)' : '(object / command)');
      var rowClass = '';
      var badge = '';
      if (evName === 'gtm.js' || (entry && entry['gtm.start'])) {
        rowClass = 'highlight-gtm';
        badge = ' <span class="tag-badge blue">GTM INITIALIZED HERE</span>';
      } else if (evName === 'pre_gtm_head_init' || evName === 'pre_gtm_body_init') {
        rowClass = 'highlight-pre';
        badge = ' <span class="tag-badge green">PRE-GTM PUSH</span>';
      }
      return '<tr class="' + rowClass + '">' +
        '<td><code>[' + idx + ']</code></td>' +
        '<td><code>' + escapeHtml(evName) + '</code>' + badge + '</td>' +
        '<td><pre class="code-block" style="margin:0; padding:0.45rem; font-size:0.76rem;">' + escapeHtml(JSON.stringify(entry, null, 2)) + '</pre></td>' +
      '</tr>';
    }).join('');

    var headSnapScripts = (headSnap.scriptsInHeadAtHeadInitTime || []).map(function (s, idx) {
      var isUnexpected = s.id !== 'dl-head-init';
      return '<li style="margin-bottom:0.35rem;">' +
        '<code>#' + (idx + 1) + ' id="' + escapeHtml(s.id) + '" src="' + escapeHtml(s.src) + '"</code> ' +
        (isUnexpected ? '<span class="tag-badge red">INJECTED BEFORE #dl-head-init!</span>' : '<span class="tag-badge green">Expected #dl-head-init</span>') +
      '</li>';
    }).join('');

    var bodySnapScripts = (bodySnap.scriptsInDomAtBodyInitTime || []).map(function (s, idx) {
      return '<li style="margin-bottom:0.35rem;">' +
        '<code>#' + (idx + 1) + ' [' + escapeHtml(s.parent) + '] id="' + escapeHtml(s.id) + '" src="' + escapeHtml(s.src) + '"</code>' +
      '</li>';
    }).join('');

    var dataLayerAndSnapshotsGrid =
      '<div class="grid-2">' +
        '<div class="panel" style="margin-bottom:0;">' +
          '<div class="panel-header">' +
            '<h3 class="panel-title">📊 Live <code>window.dataLayer</code> Queue (' + dlStats.dl.length + ' items)</h3>' +
            '<button class="btn btn-secondary" onclick="window.__renderDiagnostics && window.__renderDiagnostics()">🔄 Refresh</button>' +
          '</div>' +
          '<div class="panel-body">' +
            '<div class="table-wrap">' +
              '<table>' +
                '<thead><tr><th style="width:60px;">Index</th><th style="width:190px;">Event</th><th>Payload</th></tr></thead>' +
                '<tbody>' + dlRows + '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="panel" style="margin-bottom:0;">' +
          '<div class="panel-header">' +
            '<h3 class="panel-title">⏱️ Synchronous HTML Parser Checkpoints</h3>' +
          '</div>' +
          '<div class="panel-body">' +
            '<div style="margin-bottom:1rem;">' +
              '<h4 style="margin:0 0 0.4rem 0; font-size:0.9rem;">Checkpoint A: When <code>&lt;head&gt; #dl-head-init</code> executed</h4>' +
              '<p style="margin:0 0 0.5rem 0; font-size:0.82rem; color:var(--text-muted);">' +
                'Had <code>gtm.js</code> already started? ' +
                (headSnap.gtmAlreadyStartedBeforeHeadPush
                  ? '<span class="tag-badge red">YES (Injected above #dl-head-init!)</span>'
                  : '<span class="tag-badge green">NO (Clean)</span>') +
              '</p>' +
              '<div style="font-size:0.8rem; color:var(--text-muted);">Scripts in <code>&lt;head&gt;</code> at that exact microsecond:</div>' +
              '<ul style="margin:0.35rem 0 0 1.2rem; font-size:0.8rem;">' + headSnapScripts + '</ul>' +
            '</div>' +
            '<div style="border-top:1px solid var(--border); padding-top:1rem;">' +
              '<h4 style="margin:0 0 0.4rem 0; font-size:0.9rem;">Checkpoint B: When mid-<code>&lt;body&gt; #dl-body-init</code> executed</h4>' +
              '<p style="margin:0 0 0.5rem 0; font-size:0.82rem; color:var(--text-muted);">' +
                'Had <code>gtm.js</code> already started before the bottom of <code>&lt;body&gt;</code> was even parsed? ' +
                (bodySnap.gtmAlreadyStartedBeforeBodyPush
                  ? (scenario.expectBodyBeforeGtm
                      ? '<span class="tag-badge red">YES! (GTM ran in &lt;head&gt; instead of bottom of &lt;body&gt;!)</span>'
                      : '<span class="tag-badge blue">YES (Expected because this test places GTM in &lt;head&gt;)</span>')
                  : '<span class="tag-badge green">NO (GTM had NOT started yet when mid-&lt;body&gt; parsed!)</span>') +
              '</p>' +
              '<div style="font-size:0.8rem; color:var(--text-muted);">Scripts in DOM when mid-<code>&lt;body&gt;</code> parsed (before bottom-of-body GTM):</div>' +
              '<ul style="margin:0.35rem 0 0 1.2rem; font-size:0.8rem;">' + bodySnapScripts + '</ul>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // All Test Scenarios Directory Cards
    var directoryCards = SCENARIOS.filter(function (s) { return s.id !== 'index'; }).map(function (s) {
      var isCurrent = s.id === scenario.id;
      return '<div class="scenario-card' + (isCurrent ? ' current' : '') + '">' +
        '<div>' +
          '<h4>' + escapeHtml(s.title) + '</h4>' +
          '<div style="margin-bottom:0.5rem;"><code>' + escapeHtml(s.path) + '</code> &middot; <span class="tag-badge blue">' + escapeHtml(s.placement) + '</span></div>' +
          '<p>' + escapeHtml(s.summary) + '</p>' +
        '</div>' +
        '<div>' +
          '<a class="btn" href="' + s.path + '">' + (isCurrent ? '📍 Currently Viewing' : 'Run Test &rarr; ' + escapeHtml(s.path)) + '</a>' +
        '</div>' +
      '</div>';
    }).join('');

    var directoryPanel =
      '<div class="panel" style="margin-top:1.5rem;">' +
        '<div class="panel-header">' +
          '<h3 class="panel-title">🧭 All Test Routes on <code>nielsoverwijn.dev</code></h3>' +
        '</div>' +
        '<div class="panel-body">' +
          '<div class="scenario-cards">' + directoryCards + '</div>' +
        '</div>' +
      '</div>';

    root.innerHTML =
      navHtml +
      '<main class="container">' +
        heroHtml +
        verdictsHtml +
        gtmVerificationPanel +
        wirePanel +
        dataLayerAndSnapshotsGrid +
        directoryPanel +
      '</main>';
  }

  window.__renderDiagnostics = renderApp;

  window.addEventListener('gtm-verification-fired', function () {
    renderApp();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      renderApp();
      fetchWireComparison(getCurrentScenario(), renderApp);
      setTimeout(renderApp, 1000);
      setTimeout(renderApp, 2500);
    });
  } else {
    renderApp();
    fetchWireComparison(getCurrentScenario(), renderApp);
    setTimeout(renderApp, 1000);
    setTimeout(renderApp, 2500);
  }
})();
