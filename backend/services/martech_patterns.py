MARTECH_PATTERNS = [
  {
    "name": "Google Analytics 4",
    "category": "Analytics",
    "patterns": [
      r"googletagmanager\.com/gtag/js\?id=G-",
      r"gtag\s*\(\s*['\"]config['\"]\s*,\s*['\"]G-",
      r"google-analytics\.com/g/collect",
    ],
  },
  {
    "name": "Google Universal Analytics",
    "category": "Analytics",
    "patterns": [
      r"google-analytics\.com/analytics\.js",
      r"googletagmanager\.com/gtag/js\?id=UA-",
      r"gtag\s*\(\s*['\"]config['\"]\s*,\s*['\"]UA-",
      r"ga\s*\(\s*['\"]create['\"]",
    ],
  },
  {
    "name": "Adobe Analytics",
    "category": "Analytics",
    "patterns": [
      r"omniture\.com",
      r"2o7\.net",
      r"omtrdc\.net",
      r"s_code\.js",
      r"AppMeasurement\.js",
      r"adobeanalytics",
      r"sc\.omtrdc\.net",
    ],
  },
  {
    "name": "Mixpanel",
    "category": "Analytics",
    "patterns": [
      r"cdn\.mxpnl\.com",
      r"api\.mixpanel\.com",
      r"mixpanel\.init\s*\(",
      r"cdn4\.mxpnl\.com",
    ],
  },
  {
    "name": "Amplitude",
    "category": "Analytics",
    "patterns": [
      r"cdn\.amplitude\.com",
      r"api\.amplitude\.com",
      r"amplitude\.getInstance",
      r"amplitude\.init\s*\(",
    ],
  },
  {
    "name": "Heap Analytics",
    "category": "Analytics",
    "patterns": [
      r"cdn\.heapanalytics\.com",
      r"heapanalytics\.com",
      r"heap\.load\s*\(",
      r"heap\.identify\s*\(",
    ],
  },
  {
    "name": "Segment",
    "category": "Analytics",
    "patterns": [
      r"cdn\.segment\.com",
      r"api\.segment\.io",
      r"analytics\.load\s*\(",
      r"analytics\.identify\s*\(",
    ],
  },
  {
    "name": "Hotjar",
    "category": "Analytics",
    "patterns": [
      r"static\.hotjar\.com",
      r"script\.hotjar\.com",
      r"hj\s*\(\s*['\"]identify['\"]",
      r"hjid\s*=",
    ],
  },
  {
    "name": "Matomo / Piwik",
    "category": "Analytics",
    "patterns": [
      r"matomo\.js",
      r"piwik\.js",
      r"_paq\.push",
      r"matomo\.php",
      r"piwik\.php",
    ],
  },
  {
    "name": "Plausible Analytics",
    "category": "Analytics",
    "patterns": [
      r"plausible\.io/js/plausible",
      r"data-domain.*plausible",
    ],
  },
  {
    "name": "Fathom Analytics",
    "category": "Analytics",
    "patterns": [
      r"cdn\.usefathom\.com",
      r"fathom\.trackPageview",
    ],
  },
  {
    "name": "Clicky",
    "category": "Analytics",
    "patterns": [
      r"static\.getclicky\.com",
      r"in\.getclicky\.com",
      r"clicky\.init\s*\(",
    ],
  },
  {
    "name": "Woopra",
    "category": "Analytics",
    "patterns": [
      r"static\.woopra\.com",
      r"woopra\.com/track",
      r"woopra\.identify\s*\(",
    ],
  },
  {
    "name": "Kissmetrics",
    "category": "Analytics",
    "patterns": [
      r"scripts\.kissmetrics\.com",
      r"kissmetrics\.com/i\.js",
      r"_kmq\.push",
    ],
  },
  {
    "name": "Chartbeat",
    "category": "Analytics",
    "patterns": [
      r"static\.chartbeat\.com",
      r"chartbeat\.com/js",
      r"_sf_async_config",
    ],
  },
  {
    "name": "comScore",
    "category": "Analytics",
    "patterns": [
      r"sb\.scorecardresearch\.com",
      r"scorecardresearch\.com",
      r"beacon\.scorecardresearch\.com",
    ],
  },
  {
    "name": "FullStory",
    "category": "Analytics",
    "patterns": [
      r"fullstory\.com/s/fs\.js",
      r"edge\.fullstory\.com",
      r"FS\.identify\s*\(",
      r"_fs_debug",
    ],
  },
  {
    "name": "Lucky Orange",
    "category": "Analytics",
    "patterns": [
      r"luckyorange\.com",
      r"lo\.init\s*\(",
    ],
  },
  {
    "name": "Mouseflow",
    "category": "Analytics",
    "patterns": [
      r"cdn\.mouseflow\.com",
      r"mouseflow\.com/projects",
      r"mf\.init\s*\(",
    ],
  },
  {
    "name": "Crazy Egg",
    "category": "Analytics",
    "patterns": [
      r"crazyegg\.com/pages/scripts",
      r"script\.crazyegg\.com",
    ],
  },
  {
    "name": "Google Tag Manager",
    "category": "Tag Managers",
    "patterns": [
      r"googletagmanager\.com/gtm\.js",
      r"googletagmanager\.com/ns\.html",
      r"GTM-[A-Z0-9]+",
    ],
  },
  {
    "name": "Adobe Experience Platform Launch",
    "category": "Tag Managers",
    "patterns": [
      r"assets\.adobedtm\.com",
      r"launch-[a-z0-9]+\.min\.js",
      r"adobedtm\.com",
    ],
  },
  {
    "name": "Adobe DTM (Legacy)",
    "category": "Tag Managers",
    "patterns": [
      r"//[^/]+/satelliteLib-",
      r"window\._satellite",
    ],
  },
  {
    "name": "Tealium iQ",
    "category": "Tag Managers",
    "patterns": [
      r"tags\.tiqcdn\.com",
      r"utag\.js",
      r"utag\.sync\.js",
      r"utag_data",
    ],
  },
  {
    "name": "Ensighten",
    "category": "Tag Managers",
    "patterns": [
      r"nexus\.ensighten\.com",
      r"ensighten\.com/i/",
    ],
  },
  {
    "name": "Signal (formerly BrightTag)",
    "category": "Tag Managers",
    "patterns": [
      r"cdn\.signal\.co",
      r"signaltag\.js",
    ],
  },
  {
    "name": "Commanders Act",
    "category": "Tag Managers",
    "patterns": [
      r"cdn\.tagcommander\.com",
      r"tagcommander\.com",
    ],
  },
  {
    "name": "Meta Pixel (Facebook)",
    "category": "Advertising",
    "patterns": [
      r"connect\.facebook\.net.*fbevents\.js",
      r"fbq\s*\(\s*['\"]init['\"]",
      r"facebook\.com/tr",
    ],
  },
  {
    "name": "Google Ads",
    "category": "Advertising",
    "patterns": [
      r"googleadservices\.com/pagead/conversion",
      r"googletagmanager\.com/gtag/js\?id=AW-",
      r"gtag\s*\(\s*['\"]config['\"]\s*,\s*['\"]AW-",
    ],
  },
  {
    "name": "LinkedIn Insight Tag",
    "category": "Advertising",
    "patterns": [
      r"snap\.licdn\.com/li\.lms-analytics",
      r"linkedin\.com/px",
      r"_linkedin_partner_id",
    ],
  },
  {
    "name": "Twitter / X Pixel",
    "category": "Advertising",
    "patterns": [
      r"static\.ads-twitter\.com",
      r"t\.co/i/adsct",
      r"analytics\.twitter\.com",
      r"twq\s*\(",
    ],
  },
  {
    "name": "Pinterest Tag",
    "category": "Advertising",
    "patterns": [
      r"s\.pinimg\.com/ct/core\.js",
      r"pintrk\s*\(",
      r"ct\.pinterest\.com",
    ],
  },
  {
    "name": "TikTok Pixel",
    "category": "Advertising",
    "patterns": [
      r"analytics\.tiktok\.com/i18n/pixel",
      r"ttq\.load\s*\(",
      r"tiktok\.com/i18n/pixel",
    ],
  },
  {
    "name": "Snapchat Pixel",
    "category": "Advertising",
    "patterns": [
      r"tr\.snapchat\.com",
      r"sc-static\.net/scevent\.min\.js",
      r"snaptr\s*\(",
    ],
  },
  {
    "name": "Microsoft Advertising (Bing Ads)",
    "category": "Advertising",
    "patterns": [
      r"bat\.bing\.com",
      r"uetq\.push\s*\(",
      r"microsoft\.com/bat",
    ],
  },
  {
    "name": "Criteo",
    "category": "Advertising",
    "patterns": [
      r"static\.criteo\.net",
      r"dynamic\.criteo\.com",
      r"rtax\.criteo\.com",
      r"window\.criteo_q",
    ],
  },
  {
    "name": "Amazon Advertising",
    "category": "Advertising",
    "patterns": [
      r"s\.amazon-adsystem\.com",
      r"aax-us-east\.amazon-adsystem\.com",
      r"amzn\.to",
    ],
  },
  {
    "name": "DoubleClick / Campaign Manager",
    "category": "Advertising",
    "patterns": [
      r"fls\.doubleclick\.net",
      r"ad\.doubleclick\.net",
      r"securepubads\.g\.doubleclick\.net",
    ],
  },
  {
    "name": "AdRoll",
    "category": "Advertising",
    "patterns": [
      r"s\.adroll\.com",
      r"d\.adroll\.com",
      r"adrollimg\.com",
    ],
  },
  {
    "name": "Outbrain",
    "category": "Advertising",
    "patterns": [
      r"amplify\.outbrain\.com",
      r"outbrain\.com/outbrain\.js",
    ],
  },
  {
    "name": "Taboola",
    "category": "Advertising",
    "patterns": [
      r"cdn\.taboola\.com",
      r"_taboola\.push\s*\(",
    ],
  },
  {
    "name": "Quantcast",
    "category": "Advertising",
    "patterns": [
      r"edge\.quantserve\.com",
      r"quantcount\.com",
      r"quantserve\.com/quant\.js",
    ],
  },
  {
    "name": "HubSpot",
    "category": "Marketing Automation",
    "patterns": [
      r"js\.hs-scripts\.com",
      r"js\.hsforms\.net",
      r"js\.hscta\.net",
      r"hs-analytics\.net",
      r"hubspot\.com/analytics",
    ],
  },
  {
    "name": "Marketo",
    "category": "Marketing Automation",
    "patterns": [
      r"munchkin\.marketo\.net",
      r"Munchkin\.init\s*\(",
      r"marketo\.com/index\.php",
    ],
  },
  {
    "name": "Pardot (Salesforce)",
    "category": "Marketing Automation",
    "patterns": [
      r"pi\.pardot\.com",
      r"pardot\.com/pd\.js",
      r"piAId",
      r"piCId",
    ],
  },
  {
    "name": "Oracle Eloqua",
    "category": "Marketing Automation",
    "patterns": [
      r"img\.en25\.com",
      r"eloqua\.com/visitor/v200",
      r"tracking\.edgesuite\.net",
    ],
  },
  {
    "name": "Mailchimp",
    "category": "Marketing Automation",
    "patterns": [
      r"chimpstatic\.com",
      r"list-manage\.com",
      r"mailchimp\.com/embed",
    ],
  },
  {
    "name": "ActiveCampaign",
    "category": "Marketing Automation",
    "patterns": [
      r"trackcmp\.net",
      r"activehosted\.com/f",
      r"activehosted\.com/app",
    ],
  },
  {
    "name": "Klaviyo",
    "category": "Marketing Automation",
    "patterns": [
      r"static\.klaviyo\.com",
      r"klaviyo\.com/media/js",
      r"klaviyo\.identify\s*\(",
    ],
  },
  {
    "name": "Braze",
    "category": "Marketing Automation",
    "patterns": [
      r"js\.appboycdn\.com",
      r"appboy\.initialize\s*\(",
      r"braze\.initialize\s*\(",
    ],
  },
  {
    "name": "Iterable",
    "category": "Marketing Automation",
    "patterns": [
      r"js\.iterable\.com",
      r"iterable\.initialize\s*\(",
    ],
  },
  {
    "name": "Sailthru",
    "category": "Marketing Automation",
    "patterns": [
      r"ak\.sail-horizon\.com",
      r"sailthru\.com/horizon",
    ],
  },
  {
    "name": "Customer.io",
    "category": "Marketing Automation",
    "patterns": [
      r"assets\.customer\.io",
      r"_cio\.identify\s*\(",
    ],
  },
  {
    "name": "Drip",
    "category": "Marketing Automation",
    "patterns": [
      r"tag\.getdrip\.com",
      r"dc\.getdrip\.com",
    ],
  },
  {
    "name": "Salesforce",
    "category": "CRM",
    "patterns": [
      r"salesforce\.com/analytics",
      r"d\.la[0-9]+cs\.salesforceliveagent\.com",
      r"salesforceliveagent\.com",
    ],
  },
  {
    "name": "mParticle",
    "category": "CRM",
    "patterns": [
      r"jssdkcdns\.mparticle\.com",
      r"mparticle\.com/js",
      r"mParticle\.init\s*\(",
    ],
  },
  {
    "name": "Lytics",
    "category": "CRM",
    "patterns": [
      r"c\.lytics\.io",
      r"lytics\.io/api",
    ],
  },
  {
    "name": "Intercom",
    "category": "Chat & Support",
    "patterns": [
      r"widget\.intercom\.io",
      r"js\.intercomcdn\.com",
      r"Intercom\s*\(",
      r"intercomSettings",
    ],
  },
  {
    "name": "Drift",
    "category": "Chat & Support",
    "patterns": [
      r"js\.driftt\.com",
      r"drift\.load\s*\(",
      r"driftt\.com",
    ],
  },
  {
    "name": "Zendesk Chat",
    "category": "Chat & Support",
    "patterns": [
      r"static\.zdassets\.com",
      r"ekr\.zdassets\.com",
      r"zendesk\.com/embeddable",
    ],
  },
  {
    "name": "LiveChat",
    "category": "Chat & Support",
    "patterns": [
      r"cdn\.livechatinc\.com",
      r"livechatinc\.com/tracking\.js",
    ],
  },
  {
    "name": "Olark",
    "category": "Chat & Support",
    "patterns": [
      r"static\.olark\.com",
      r"olark\.identify\s*\(",
    ],
  },
  {
    "name": "Freshchat",
    "category": "Chat & Support",
    "patterns": [
      r"wchat\.freshchat\.com",
      r"euc-widget\.freshworks\.com",
    ],
  },
  {
    "name": "Tidio",
    "category": "Chat & Support",
    "patterns": [
      r"code\.tidio\.co",
      r"widget\.tidio\.co",
    ],
  },
  {
    "name": "Tawk.to",
    "category": "Chat & Support",
    "patterns": [
      r"embed\.tawk\.to",
      r"tawk\.to/s/",
    ],
  },
  {
    "name": "Crisp Chat",
    "category": "Chat & Support",
    "patterns": [
      r"client\.crisp\.chat",
      r"crisp\.chat/js/sdk",
      r"$crisp\.push\s*\(",
    ],
  },
  {
    "name": "Optimizely",
    "category": "A/B Testing",
    "patterns": [
      r"cdn\.optimizely\.com",
      r"optimizely\.com/js",
      r"window\.optimizely",
    ],
  },
  {
    "name": "VWO (Visual Website Optimizer)",
    "category": "A/B Testing",
    "patterns": [
      r"dev\.visualwebsiteoptimizer\.com",
      r"visualwebsiteoptimizer\.com/deploy",
      r"vwo_code",
    ],
  },
  {
    "name": "Google Optimize",
    "category": "A/B Testing",
    "patterns": [
      r"googleoptimize\.com/optimize\.js",
      r"gtag\s*\(\s*['\"]config['\"]\s*,\s*['\"]OPT-",
    ],
  },
  {
    "name": "Adobe Target",
    "category": "A/B Testing",
    "patterns": [
      r"tt\.omtrdc\.net",
      r"mbox\.js",
      r"at\.js",
      r"adobe\.target\.getOffer",
    ],
  },
  {
    "name": "AB Tasty",
    "category": "A/B Testing",
    "patterns": [
      r"try\.abtasty\.com",
      r"abtasty\.com/js",
    ],
  },
  {
    "name": "Convert",
    "category": "A/B Testing",
    "patterns": [
      r"cdn-4\.convertexperiments\.com",
      r"convertexperiments\.com",
    ],
  },
  {
    "name": "LaunchDarkly",
    "category": "A/B Testing",
    "patterns": [
      r"app\.launchdarkly\.com/sdk",
      r"clientsideevents\.launchdarkly\.com",
    ],
  },
  {
    "name": "Moz",
    "category": "SEO",
    "patterns": [
      r"moz\.com/api",
    ],
  },
  {
    "name": "Yoast SEO",
    "category": "SEO",
    "patterns": [
      r"yoast\.com",
      r"\"@type\"\s*:\s*\"Article\"",
    ],
  },
  {
    "name": "OneTrust",
    "category": "Consent Management",
    "patterns": [
      r"cdn\.cookielaw\.org",
      r"optanon\.blob\.core\.windows\.net",
      r"OneTrust\.Init\s*\(",
    ],
  },
  {
    "name": "Cookiebot",
    "category": "Consent Management",
    "patterns": [
      r"consent\.cookiebot\.com",
      r"cookiebot\.com/en/cookie-declaration",
    ],
  },
  {
    "name": "TrustArc",
    "category": "Consent Management",
    "patterns": [
      r"consent\.trustarc\.com",
      r"truste\.com/notice",
    ],
  },
  {
    "name": "Didomi",
    "category": "Consent Management",
    "patterns": [
      r"sdk\.privacy-center\.org",
      r"didomi\.io/public",
    ],
  },
  # ASIAN REGIONAL TECH
  {
    "name": "Naver Analytics",
    "category": "Analytics",
    "patterns": [
      r"wcs\.naver\.net/wcslog\.js",
      r"wcs_do\s*\(",
    ],
  },
  {
    "name": "Kakao Pixel",
    "category": "Advertising",
    "patterns": [
      r"t1\.daumcdn\.net/adfit",
      r"kakao\.pixel\s*\(",
      r"sdk\.kakao\.com",
    ],
  },
  {
    "name": "Baidu Tongji",
    "category": "Analytics",
    "patterns": [
      r"hm\.baidu\.com/hm\.js",
      r"_hmt\.push\s*\(",
    ],
  },
  {
    "name": "Line Tag",
    "category": "Advertising",
    "patterns": [
      r"tr\.line\.me/tag\.js",
      r"_lt\s*\(\s*['\"]init['\"]",
    ],
  },
  {
    "name": "Yahoo Japan Advertising",
    "category": "Advertising",
    "patterns": [
      r"s\.yimg\.jp/images/listing/tool/cv/conversion\.js",
      r"s\.yimg\.jp/lib/yjdn/tag/yjtag\.js",
    ],
  },
]
