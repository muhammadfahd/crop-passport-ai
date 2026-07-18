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
let pendingActivity = null;
let reviewTimer = null;

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

function renderInformationCard(label, value, icon) {
  return `<article class="info-card"><span class="info-icon">${icon}</span><div><p>${label}</p><strong>${value || 'Not provided'}</strong></div></article>`;
}

function getRelativeDate(date) {
  const today = new Date();
  const activityDay = new Date(`${date}T00:00:00`);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const difference = Math.round((startOfToday - activityDay) / 86400000);
  if (difference === 0) return 'Today';
  if (difference === 1) return 'Yesterday';
  return CropPassport.formatDate(date);
}

function getActivityType(activity) {
  return activity.type || 'text';
}

function getActivityPresentation(activity) {
  const presentations = {
    text: { icon: '📝', label: 'Text activity' },
    photo: { icon: '📷', label: 'Photo uploaded' },
    voice: { icon: '🎤', label: 'Voice note' }
  };
  return presentations[getActivityType(activity)] || presentations.text;
}

function getDaysSincePlanting(date) {
  const planted = new Date(`${date}T00:00:00`);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((todayStart - planted) / 86400000));
}

function renderSummary(activities) {
  const totals = activities.reduce((counts, activity) => {
    counts[getActivityType(activity)] = (counts[getActivityType(activity)] || 0) + 1;
    return counts;
  }, { text: 0, photo: 0, voice: 0 });
  const progress = Math.min(100, 20 + (totals.text * 10) + (totals.photo * 15) + (totals.voice * 15));
  const statistics = [
    ['🌱', getDaysSincePlanting(harvest.plantingDate), 'Days Since Planting'],
    ['📝', activities.length, 'Total Activities'],
    ['📷', totals.photo, 'Photos Uploaded'],
    ['🎤', totals.voice, 'Voice Notes']
  ];
  statisticsContainer.innerHTML = statistics.map(([icon, value, label]) => `<article class="stat-card"><span>${icon}</span><strong>${value}</strong><p>${label}</p></article>`).join('');
  document.querySelector('#progress-percentage').textContent = `${progress}%`;
  document.querySelector('#progress-bar').style.width = `${progress}%`;
}

function renderActivities() {
  if (!harvest) return;
  const activities = CropPassport.getActivities(harvest.id)
    .sort((a, b) => {
      const dateDifference = new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`);
      return dateDifference || new Date(b.createdAt) - new Date(a.createdAt);
    });
  renderSummary(activities);
  if (!activities.length) {
    timelineContainer.innerHTML = '<div class="empty-activities"><span>⌁</span><p>No farming activities have been recorded.</p></div>';
    return;
  }
  timelineContainer.innerHTML = activities.map((activity, index) => {
    const presentation = getActivityPresentation(activity);
    return `<article class="timeline-card" style="--card-index:${index}"><span class="timeline-node ${getActivityType(activity)}"><span>${presentation.icon}</span></span><div class="timeline-card-content"><div class="timeline-card-heading"><div><p class="activity-type">${presentation.label}</p><h3>${escapeHtml(activity.title)}</h3></div><time datetime="${activity.date}">${getRelativeDate(activity.date)}</time></div><p>${escapeHtml(activity.description)}</p><small>${CropPassport.formatDate(activity.date)}</small></div></article>`;
  }).join('');
}

function openActivityModal(activityData = null) {
  if (!harvest) return;
  activityForm.reset();
  Object.entries(activityData || { date: new Date().toISOString().split('T')[0] }).forEach(([key, value]) => {
    if (activityForm.elements[key]) activityForm.elements[key].value = value;
  });
  activityModal.showModal();
  activityForm.title.focus();
}

function closeActivityModal() { activityModal.close(); }

function showAiReview() {
  aiReviewLoading.hidden = false;
  aiReviewResults.hidden = true;
  aiReviewActions.hidden = true;
  aiReviewModal.showModal();
  reviewTimer = window.setTimeout(() => {
    aiReviewLoading.hidden = true;
    aiReviewResults.hidden = false;
    aiReviewActions.hidden = false;
  }, 2000);
}

function closeAiReview() {
  window.clearTimeout(reviewTimer);
  aiReviewModal.close();
}

function submitForAiReview(event) {
  event.preventDefault();
  if (!activityForm.reportValidity() || !harvest) return;
  pendingActivity = Object.fromEntries(new FormData(activityForm));
  closeActivityModal();
  showAiReview();
}

function saveReviewedActivity() {
  if (!pendingActivity || !harvest) return;
  CropPassport.saveActivity({ id: CropPassport.createActivityId(), harvestId: harvest.id, ...pendingActivity, createdAt: new Date().toISOString() });
  pendingActivity = null;
  closeAiReview();
  renderActivities();
}

function editReviewedActivity() { closeAiReview(); openActivityModal(pendingActivity); }

function cancelAiReview() { pendingActivity = null; closeAiReview(); activityForm.reset(); }

if (harvest) {
  document.querySelector('.passport-action').href = `passport.html?id=${encodeURIComponent(harvest.id)}`;
  document.querySelector('#detail-harvest-name').textContent = harvest.harvestName;
  document.querySelector('#detail-crop').textContent = `${harvest.cropName} · ${harvest.cropVariety}`;
  const information = [['Harvest ID', harvest.id, '#'], ['Farmer Name', harvest.farmerName, '♙'], ['Harvest Name', harvest.harvestName, '✦'], ['Crop', harvest.cropName, '⌁'], ['Variety', harvest.cropVariety, '◈'], ['Location', harvest.farmLocation, '⌖'], ['Planting Date', CropPassport.formatDate(harvest.plantingDate), '◷'], ['Expected Harvest Date', CropPassport.formatDate(harvest.expectedHarvestDate), '◷']];
  detailsContainer.innerHTML = information.map(([label, value, icon]) => renderInformationCard(label, value, icon)).join('');
  renderActivities();
  document.querySelector('#add-text-activity').addEventListener('click', openActivityModal);
  activityForm.addEventListener('submit', submitForAiReview);
  document.querySelector('#close-modal').addEventListener('click', closeActivityModal);
  document.querySelector('#cancel-activity').addEventListener('click', closeActivityModal);
  document.querySelector('#save-ai-activity').addEventListener('click', saveReviewedActivity);
  document.querySelector('#edit-ai-activity').addEventListener('click', editReviewedActivity);
  document.querySelector('#cancel-ai-review').addEventListener('click', cancelAiReview);
} else {
  document.querySelector('#detail-harvest-name').textContent = 'Harvest not found';
  document.querySelector('#detail-crop').textContent = 'Create a new harvest record to see its details here.';
  detailsContainer.innerHTML = '<p class="missing-record">We could not find this harvest record in this browser.</p>';
  timelineContainer.innerHTML = '';
  document.querySelector('#add-text-activity').disabled = true;
}
