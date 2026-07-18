const harvestList = document.querySelector('#harvest-list');

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value || '';
  return element.innerHTML;
}

function renderHarvests() {
  const harvests = CropPassport.getHarvests().sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
  if (!harvests.length) {
    harvestList.innerHTML = '<p class="empty-harvests">No harvests saved yet. Create a harvest to begin its trusted story.</p>';
    return;
  }
  harvestList.innerHTML = harvests.map((harvest) => `<article class="harvest-card"><div><p class="eyebrow">${harvest.id}</p><h3>${escapeHtml(harvest.harvestName)}</h3><p>${escapeHtml(harvest.cropName)} · ${escapeHtml(harvest.farmerName)}</p><small>Created ${CropPassport.formatDate(harvest.createdAt.slice(0, 10))}</small></div><div class="harvest-card-actions"><span class="status-pill">Record created</span><div><a href="harvest-details.html?id=${encodeURIComponent(harvest.id)}">Continue</a><a href="passport.html?id=${encodeURIComponent(harvest.id)}">View Passport</a><button type="button" data-delete-harvest="${escapeHtml(harvest.id)}">Delete</button></div></div></article>`).join('');
}

harvestList.addEventListener('click', (event) => {
  const harvestId = event.target.dataset.deleteHarvest;
  if (!harvestId || !window.confirm('Delete this harvest and its recorded activities?')) return;
  CropPassport.deleteHarvest(harvestId);
  renderHarvests();
});

renderHarvests();
