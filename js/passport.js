const passportId = new URLSearchParams(window.location.search).get('id');
const passportHarvest = CropPassport.getHarvest(passportId);
const passportContent = document.querySelector('#passport-content');

function escapeHtml(value) { const element = document.createElement('div'); element.textContent = value || ''; return element.innerHTML; }
function renderTimeline(activities) {
  if (!activities.length) return '<p class="empty-copy">No activities have been documented yet.</p>';
  return `<ol class="passport-timeline">${activities.map((activity) => { const presentation = CropPassport.getActivityPresentation(activity); return `<li><span class="activity-icon">${presentation.icon}</span><div><p class="timeline-meta">${presentation.label} · ${CropPassport.formatDate(activity.date)}</p><h3>${escapeHtml(activity.title)}</h3><p>${escapeHtml(activity.description)}</p></div></li>`; }).join('')}</ol>`;
}

if (!passportHarvest) {
  passportContent.innerHTML = '<section class="passport-empty"><p class="eyebrow">DIGITAL CROP PASSPORT</p><h1>Harvest not found</h1><p>Select a saved harvest to view its passport.</p><a class="passport-button secondary" href="index.html#my-harvests">View my harvests</a></section>';
} else {
  const activities = CropPassport.getActivities(passportHarvest.id).sort((first, second) => new Date(`${first.date}T00:00:00`) - new Date(`${second.date}T00:00:00`));
  const score = CropPassport.getTraceabilityScore(passportHarvest, activities);
  const passportNumber = CropPassport.getPassportNumber(passportHarvest.id);
  const lastUpdated = CropPassport.getLastUpdated(passportHarvest, activities);
  const buyerUrl = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}buyer-passport.html?id=${encodeURIComponent(passportHarvest.id)}`;
  document.querySelector('#passport-back-link').href = `harvest-details.html?id=${encodeURIComponent(passportHarvest.id)}`;
  passportContent.innerHTML = `<article class="digital-passport"><header class="certificate-header"><div><p class="certificate-brand">✦ CropPassport AI</p><p class="eyebrow">DIGITAL CROP PASSPORT</p><h1>${escapeHtml(passportHarvest.cropName)} <em>${escapeHtml(passportHarvest.cropVariety)}</em></h1><p class="certificate-subtitle">${escapeHtml(passportHarvest.harvestName)} · ${escapeHtml(passportHarvest.farmerName)} · ${escapeHtml(passportHarvest.farmLocation)}</p></div><div class="certificate-stamp"><span>TRACEABILITY</span><strong>Record Available</strong><small>${passportNumber}</small></div></header><section class="passport-intro"><div><p class="eyebrow">PASSPORT NUMBER</p><strong>${passportNumber}</strong></div><div><p class="eyebrow">VERIFICATION STATUS</p><strong>Traceability Record Available</strong></div><a class="passport-button" href="harvest-details.html?id=${encodeURIComponent(passportHarvest.id)}">Back to harvest</a></section><div class="passport-grid"><section class="passport-section"><p class="section-number">01</p><h2>Crop Identity</h2><dl class="data-list"><div><dt>Crop</dt><dd>${escapeHtml(passportHarvest.cropName)}</dd></div><div><dt>Variety</dt><dd>${escapeHtml(passportHarvest.cropVariety)}</dd></div><div><dt>Harvest Name</dt><dd>${escapeHtml(passportHarvest.harvestName)}</dd></div><div><dt>Passport Number</dt><dd>${passportNumber}</dd></div></dl></section><section class="passport-section"><p class="section-number">02</p><h2>Origin</h2><dl class="data-list"><div><dt>Farmer</dt><dd>${escapeHtml(passportHarvest.farmerName)}</dd></div><div><dt>Farm Location</dt><dd>${escapeHtml(passportHarvest.farmLocation)}</dd></div></dl></section><section class="passport-section"><p class="section-number">03</p><h2>Cultivation Information</h2><dl class="data-list"><div><dt>Planting Date</dt><dd>${CropPassport.formatDate(passportHarvest.plantingDate)}</dd></div><div><dt>Expected Harvest Date</dt><dd>${CropPassport.formatDate(passportHarvest.expectedHarvestDate)}</dd></div></dl></section><section class="passport-section score-section"><p class="section-number">04</p><h2>Traceability Completeness Score</h2><div class="score-display"><strong>${score}</strong><span>/100</span></div><div class="score-track"><span style="width:${score}%"></span></div><p>This score represents the completeness of the digital traceability record. It does not represent official certification or laboratory-tested crop quality.</p></section></div><section class="passport-section timeline-section"><p class="section-number">05</p><h2>Traceability Timeline</h2>${renderTimeline(activities)}</section><section class="passport-section summary-section"><p class="section-number">06</p><h2>AI Traceability Summary</h2><p>AI Summary Placeholder — ${escapeHtml(passportHarvest.harvestName)} is a ${escapeHtml(passportHarvest.cropVariety)} ${escapeHtml(passportHarvest.cropName)} record from ${escapeHtml(passportHarvest.farmLocation)}, with ${activities.length} documented field activit${activities.length === 1 ? 'y' : 'ies'}.</p></section><section class="verification-section"><div><p class="eyebrow">VERIFICATION</p><h2>Record details</h2></div><dl class="verification-list"><div><dt>Passport ID</dt><dd>${passportNumber}</dd></div><div><dt>Record status</dt><dd>Traceability Record Available</dd></div><div><dt>Last updated</dt><dd>${CropPassport.formatDate(lastUpdated.slice(0, 10))}</dd></div></dl></section><section class="qr-section"><div><p class="eyebrow">BUYER VERIFICATION</p><h2>Scan to Verify Crop Passport</h2><p>Open the read-only record for buyers and supply-chain partners.</p><a class="passport-button" href="buyer-passport.html?id=${encodeURIComponent(passportHarvest.id)}">Open Buyer View</a></div><div id="passport-qr" class="real-qr" aria-label="QR code for buyer crop passport"></div></section></article>`;
  if (window.QRCode) new QRCode(document.querySelector('#passport-qr'), { text: buyerUrl, width: 164, height: 164, colorDark: '#173e2a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  const summarySection = document.querySelector('.summary-section');
  const summaryTitle = summarySection.querySelector('h2');
  const summaryCopy = summarySection.querySelector('p:last-child');
  const savedSummary = passportHarvest.aiTraceabilitySummary;
  const fallbackSummary = CropPassportAI.createFallbackTraceabilitySummary(passportHarvest, activities);
  const displaySummary = savedSummary?.summary ? savedSummary : fallbackSummary;
  summaryTitle.textContent = 'AI-Generated Traceability Summary';
  summaryCopy.textContent = `Generated from producer-provided digital farming records. ${displaySummary.summary}`;
  if (Array.isArray(displaySummary.highlights) && displaySummary.highlights.length) {
    summarySection.insertAdjacentHTML('beforeend', `<ul class="ai-highlights">${displaySummary.highlights.map((highlight) => `<li>${escapeHtml(highlight)}</li>`).join('')}</ul>`);
  }
  if (!savedSummary?.summary) {
    const generateButton = document.createElement('button');
    generateButton.className = 'passport-button';
    generateButton.type = 'button';
    generateButton.textContent = 'Generate AI Traceability Summary';
    summarySection.append(generateButton);
    generateButton.addEventListener('click', async () => {
      generateButton.disabled = true;
      generateButton.textContent = 'Generating summary…';
      try {
        const generated = await CropPassportAI.generateTraceabilitySummary(passportHarvest, activities);
        const saved = { summary: generated.summary, highlights: generated.highlights, generatedAt: new Date().toISOString() };
        CropPassport.updateHarvest(passportHarvest.id, { aiTraceabilitySummary: saved });
        summaryCopy.textContent = `Generated from producer-provided digital farming records. ${saved.summary}`;
        summarySection.querySelector('.ai-highlights')?.remove();
        if (saved.highlights.length) summarySection.insertAdjacentHTML('beforeend', `<ul class="ai-highlights">${saved.highlights.map((highlight) => `<li>${escapeHtml(highlight)}</li>`).join('')}</ul>`);
        generateButton.remove();
      } catch (error) {
        summaryCopy.textContent = `${error.message} Showing the local placeholder summary: ${fallbackSummary.summary}`;
        generateButton.disabled = false;
        generateButton.textContent = 'Retry AI Traceability Summary';
      }
    });
  }
}
