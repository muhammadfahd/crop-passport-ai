const harvestId = new URLSearchParams(window.location.search).get('id');
const harvest = CropPassport.getHarvest(harvestId);
const detailsContainer = document.querySelector('#harvest-information');
const timelineContainer = document.querySelector('#activity-timeline');
const statisticsContainer = document.querySelector('#harvest-statistics');
const activityModal = document.querySelector('#activity-modal');
const activityForm = document.querySelector('#activity-form');
const aiReviewModal = document.querySelector('#ai-review-modal');
const aiReviewLoading = document.querySelector('#ai-review-loading');
const aiReviewResults = document.querySelector('#ai-review-results');
const aiReviewActions = document.querySelector('#ai-review-actions');
const saveAiButton = document.querySelector('#save-ai-activity');
const saveOriginalNoteButton = document.querySelector('#save-original-note');
let pendingActivity = null;

function escapeHtml(value) { const element = document.createElement('div'); element.textContent = value || ''; return element.innerHTML; }
function getActivityType(activity) { return activity.type || 'text'; }
function getDaysSincePlanting(date) { return Math.max(0, Math.floor((new Date() - new Date(`${date}T00:00:00`)) / 86400000)); }
function renderInformationCard(label, value, icon) { return `<article class="info-card"><span class="info-icon">${icon}</span><div><p>${label}</p><strong>${value || 'Not provided'}</strong></div></article>`; }

function renderSummary(activities) {
  const totals = activities.reduce((counts, activity) => { counts[getActivityType(activity)] = (counts[getActivityType(activity)] || 0) + 1; return counts; }, { text: 0, photo: 0, voice: 0 });
  const progress = Math.min(100, 20 + totals.text * 10 + totals.photo * 15 + totals.voice * 15);
  const statistics = [['🌱', getDaysSincePlanting(harvest.plantingDate), 'Days Since Planting'], ['📝', activities.length, 'Total Activities'], ['📷', totals.photo, 'Photos Uploaded'], ['🎤', totals.voice, 'Voice Notes']];
  statisticsContainer.innerHTML = statistics.map(([icon, value, label]) => `<article class="stat-card"><span>${icon}</span><strong>${value}</strong><p>${label}</p></article>`).join('');
  document.querySelector('#progress-percentage').textContent = `${progress}%`; document.querySelector('#progress-bar').style.width = `${progress}%`;
}

function renderActivities() {
  if (!harvest) return;
  const activities = CropPassport.getActivities(harvest.id).sort((first, second) => new Date(`${second.date}T00:00:00`) - new Date(`${first.date}T00:00:00`) || new Date(second.createdAt) - new Date(first.createdAt));
  renderSummary(activities);
  if (!activities.length) { timelineContainer.innerHTML = '<div class="empty-activities"><span>⌁</span><p>No farming activities have been recorded.</p></div>'; return; }
  timelineContainer.innerHTML = activities.map((activity, index) => {
    const presentation = CropPassport.getActivityPresentation(activity);
    if (activity.aiAnalysis) {
      return `<article class="timeline-card" style="--card-index:${index}"><span class="timeline-node text"><span>✨</span></span><div class="timeline-card-content"><div class="timeline-card-heading"><div><p class="activity-type">✨ AI Structured Activity</p><h3>${escapeHtml(activity.aiAnalysis.category)}</h3></div><time datetime="${activity.date}">${CropPassport.formatDate(activity.date)}</time></div><p>${escapeHtml(activity.aiAnalysis.summary)}</p><details class="original-note"><summary>View Original Farmer Note</summary><p>${escapeHtml(activity.originalText)}</p></details></div></article>`;
    }
    const note = activity.originalText || activity.description || activity.title || '';
    return `<article class="timeline-card" style="--card-index:${index}"><span class="timeline-node ${getActivityType(activity)}"><span>${presentation.icon}</span></span><div class="timeline-card-content"><div class="timeline-card-heading"><div><p class="activity-type">📝 Farming Activity</p><h3>${escapeHtml(note)}</h3></div><time datetime="${activity.date}">${CropPassport.formatDate(activity.date)}</time></div></div></article>`;
  }).join('');
}

function openActivityModal(activityData = {}) { activityForm.reset(); activityForm.elements.date.value = activityData.date || new Date().toISOString().split('T')[0]; activityForm.elements.originalText.value = activityData.originalText || ''; activityModal.showModal(); activityForm.elements.originalText.focus(); }
function closeActivityModal() { activityModal.close(); }
function closeAiReview() { aiReviewModal.close(); }
function getFormActivity() { return { ...Object.fromEntries(new FormData(activityForm)), type: 'text' }; }
function saveOriginalActivity(activity) { CropPassport.saveActivity({ id: CropPassport.createActivityId(), harvestId: harvest.id, type: 'text', originalText: activity.originalText, title: 'Farming Activity', description: activity.originalText, date: activity.date, createdAt: new Date().toISOString() }); }
function resetReviewActions() { saveAiButton.hidden = false; saveAiButton.disabled = false; saveOriginalNoteButton.hidden = true; document.querySelector('#edit-ai-activity').textContent = 'Edit Note'; }
function populateReview(activity) { document.querySelector('#ai-category').textContent = activity.aiAnalysis.category; document.querySelector('#ai-summary').textContent = activity.aiAnalysis.summary; document.querySelector('#ai-attention-level').textContent = activity.aiAnalysis.attentionLevel; document.querySelector('#ai-follow-up').textContent = activity.aiAnalysis.suggestedFollowUp; document.querySelector('#ai-original-note').textContent = activity.originalText; }

function saveWithoutAi() {
  if (!activityForm.reportValidity() || !harvest) return;
  saveOriginalActivity(getFormActivity()); activityForm.reset(); closeActivityModal(); renderActivities();
}

async function submitForAiReview(event) {
  event.preventDefault();
  if (!activityForm.reportValidity() || !harvest) return;
  const formData = getFormActivity(); pendingActivity = formData;
  closeActivityModal(); resetReviewActions(); aiReviewLoading.hidden = false; aiReviewResults.hidden = true; aiReviewActions.hidden = true; aiReviewModal.showModal();
  try {
    const aiAnalysis = await CropPassportAI.analyzeActivity(formData.originalText, { crop: harvest.cropName, variety: harvest.cropVariety, location: harvest.farmLocation });
    pendingActivity = { ...formData, title: aiAnalysis.category, description: aiAnalysis.summary, aiAnalysis };
    populateReview(pendingActivity); aiReviewLoading.hidden = true; aiReviewResults.hidden = false; aiReviewActions.hidden = false;
  } catch {
    aiReviewLoading.hidden = true; aiReviewResults.hidden = false;
    document.querySelector('#ai-category').textContent = 'AI Analysis Unavailable';
    document.querySelector('#ai-summary').textContent = 'AI analysis is temporarily unavailable. You can still save your original farming record.';
    document.querySelector('#ai-attention-level').textContent = 'Not available';
    document.querySelector('#ai-follow-up').textContent = 'Save the original note now or return to your note and try again later.';
    document.querySelector('#ai-original-note').textContent = formData.originalText;
    saveAiButton.hidden = true; saveOriginalNoteButton.hidden = false; document.querySelector('#edit-ai-activity').textContent = 'Back to Note'; aiReviewActions.hidden = false;
  }
}

function saveReviewedActivity() { if (!pendingActivity?.aiAnalysis || !harvest) return; CropPassport.saveActivity({ id: CropPassport.createActivityId(), harvestId: harvest.id, ...pendingActivity, createdAt: new Date().toISOString() }); pendingActivity = null; closeAiReview(); renderActivities(); }
function saveOriginalFromReview() { if (!pendingActivity || !harvest) return; saveOriginalActivity(pendingActivity); pendingActivity = null; closeAiReview(); renderActivities(); }
function editReviewedActivity() { const activity = pendingActivity; closeAiReview(); resetReviewActions(); if (activity) openActivityModal(activity); }
function cancelAiReview() { pendingActivity = null; closeAiReview(); activityForm.reset(); resetReviewActions(); }

if (harvest) {
  document.querySelector('.passport-action').href = `passport.html?id=${encodeURIComponent(harvest.id)}`;
  document.querySelector('#detail-harvest-name').textContent = harvest.harvestName; document.querySelector('#detail-crop').textContent = `${harvest.cropName} · ${harvest.cropVariety}`;
  const information = [['Harvest ID', harvest.id, '#'], ['Farmer Name', harvest.farmerName, '♙'], ['Harvest Name', harvest.harvestName, '✦'], ['Crop', harvest.cropName, '⌁'], ['Variety', harvest.cropVariety, '◇'], ['Location', harvest.farmLocation, '⌖'], ['Planting Date', CropPassport.formatDate(harvest.plantingDate), '◷'], ['Expected Harvest Date', CropPassport.formatDate(harvest.expectedHarvestDate), '◷']];
  detailsContainer.innerHTML = information.map(([label, value, icon]) => renderInformationCard(label, value, icon)).join(''); renderActivities();
  document.querySelector('#add-text-activity').addEventListener('click', () => openActivityModal()); activityForm.addEventListener('submit', submitForAiReview); document.querySelector('#save-original-activity').addEventListener('click', saveWithoutAi); document.querySelector('#close-modal').addEventListener('click', closeActivityModal); document.querySelector('#cancel-activity').addEventListener('click', closeActivityModal); saveAiButton.addEventListener('click', saveReviewedActivity); saveOriginalNoteButton.addEventListener('click', saveOriginalFromReview); document.querySelector('#edit-ai-activity').addEventListener('click', editReviewedActivity); document.querySelector('#cancel-ai-review').addEventListener('click', cancelAiReview);
} else {
  document.querySelector('#detail-harvest-name').textContent = 'Harvest not found'; document.querySelector('#detail-crop').textContent = 'Create a new harvest record to see its details here.'; detailsContainer.innerHTML = '<p class="missing-record">We could not find this harvest record in this browser.</p>'; timelineContainer.innerHTML = ''; document.querySelector('#add-text-activity').disabled = true;
}
