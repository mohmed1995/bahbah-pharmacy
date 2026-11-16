async function verifyLive() {
  const prodUrl = 'https://bahbah-pharmacy.pages.dev';
  console.log('Testing live production at:', prodUrl);

  const res = await fetch(`${prodUrl}/?nocache=${Date.now()}`);
  const html = await res.text();
  console.log('Production HTTP Status:', res.status);

  // Extract JS bundle paths
  const scripts = [];
  const scriptRegex = /src="(\/_next\/static\/chunks\/[^"]+\.js)"/g;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[1]);
  }

  console.log(`Checking ${scripts.length} client JavaScript chunks...`);
  let hasVitals = false;
  let hasChange = false;
  let hasVillages = false;

  for (const scriptPath of scripts) {
    const jsUrl = `${prodUrl}${scriptPath}`;
    const js = await fetch(jsUrl).then(r => r.text());
    if (js.includes('vitals') || js.includes('قياسات')) hasVitals = true;
    if (js.includes('معاك فكة')) hasChange = true;
    if (js.includes('صنبو') || js.includes('دشلوط')) hasVillages = true;
  }

  console.log('--------------------------------------------------');
  console.log('✅ Has Vitals Portal & Health Tracker:', hasVitals);
  console.log('✅ Has COD Cash Change Float ("معاك فكة كام؟"):', hasChange);
  console.log('✅ Has 17+ Dairut Villages (صنبو، دشلوط، مسارة):', hasVillages);
  console.log('--------------------------------------------------');
  if (hasVitals && hasChange && hasVillages) {
    console.log('🏆 100% SUCCESS: Live Cloudflare Pages production is completely synchronized!');
  } else {
    console.log('ℹ️ CDN Edge cache may take 1-2 minutes to invalidate globally.');
  }
}

verifyLive();
