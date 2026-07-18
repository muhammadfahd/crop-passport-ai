const harvestForm = document.querySelector('#harvest-form');

function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  harvestForm.plantingDate.value = today;
  harvestForm.expectedHarvestDate.min = today;
}

if (harvestForm) {
  setDefaultDates();
  harvestForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!harvestForm.reportValidity()) return;
    const harvest = { id: CropPassport.createHarvestId(), ...Object.fromEntries(new FormData(harvestForm)), createdAt: new Date().toISOString() };
    CropPassport.saveHarvest(harvest);
    document.querySelector('#form-message').textContent = 'Harvest record created. Opening details…';
    window.location.href = `harvest-details.html?id=${encodeURIComponent(harvest.id)}`;
  });
}
