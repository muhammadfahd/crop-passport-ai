/* Shared helpers and persistent browser storage for the hackathon MVP. */
const CropPassport = {
  storageKey: 'cropPassportHarvests',
  formatDate(date) {
    if (!date) return 'Not provided';
    return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T00:00:00`));
  },
  createHarvestId() {
    return `CP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  },
  getHarvests() {
    try {
      const savedHarvests = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return Array.isArray(savedHarvests) ? savedHarvests : Object.values(savedHarvests);
    } catch {
      return [];
    }
  },
  saveHarvest(harvest) {
    const harvests = this.getHarvests();
    if (harvests.some((savedHarvest) => savedHarvest.id === harvest.id)) return false;
    harvests.push(harvest);
    localStorage.setItem(this.storageKey, JSON.stringify(harvests));
    localStorage.setItem('cropPassportLatestHarvest', harvest.id);
    return true;
  },
  getHarvest(id) {
    const harvests = this.getHarvests();
    const harvestId = id || localStorage.getItem('cropPassportLatestHarvest');
    return harvests.find((harvest) => harvest.id === harvestId) || null;
  },
  updateHarvest(harvestId, updates) {
    const harvests = this.getHarvests();
    const index = harvests.findIndex((harvest) => harvest.id === harvestId);
    if (index === -1) return null;
    harvests[index] = { ...harvests[index], ...updates };
    localStorage.setItem(this.storageKey, JSON.stringify(harvests));
    return harvests[index];
  },
  deleteHarvest(harvestId) {
    const harvests = this.getHarvests();
    const remainingHarvests = harvests.filter((harvest) => harvest.id !== harvestId);
    if (remainingHarvests.length === harvests.length) return false;
    localStorage.setItem(this.storageKey, JSON.stringify(remainingHarvests));
    const activities = JSON.parse(localStorage.getItem('cropPassportActivities') || '[]');
    localStorage.setItem('cropPassportActivities', JSON.stringify(activities.filter((activity) => activity.harvestId !== harvestId)));
    if (localStorage.getItem('cropPassportLatestHarvest') === harvestId) localStorage.setItem('cropPassportLatestHarvest', remainingHarvests.at(-1)?.id || '');
    return true;
  },
  getActivities(harvestId) {
    const activities = JSON.parse(localStorage.getItem('cropPassportActivities') || '[]');
    return activities.filter((activity) => activity.harvestId === harvestId);
  },
  getPassportNumber(harvestId) {
    return `CPP-${harvestId.replace('CP-', '')}`;
  },
  getTraceabilityScore(harvest, activities) {
    const harvestInformationComplete = ['harvestName', 'cropName', 'cropVariety', 'farmerName', 'farmLocation', 'plantingDate', 'expectedHarvestDate']
      .every((field) => Boolean(harvest[field]));
    const activityTypes = activities.map((activity) => activity.type || 'text');
    return Math.min(100,
      (harvestInformationComplete ? 30 : 0)
      + (activities.length >= 1 ? 20 : 0)
      + (activities.length >= 3 ? 15 : 0)
      + (activityTypes.includes('photo') ? 15 : 0)
      + (activityTypes.includes('voice') ? 10 : 0)
      + 10
    );
  },
  getLastUpdated(harvest, activities) {
    const activityDates = activities.map((activity) => activity.createdAt || activity.date).filter(Boolean);
    return [harvest.createdAt, ...activityDates].filter(Boolean).sort().at(-1) || harvest.createdAt;
  },
  getActivityPresentation(activity) {
    const type = activity.type || 'text';
    return {
      text: { icon: '📝', label: 'Field activity' },
      photo: { icon: '📷', label: 'Photo record' },
      voice: { icon: '🎤', label: 'Voice note' }
    }[type] || { icon: '📝', label: 'Field activity' };
  },
  saveActivity(activity) {
    const activities = JSON.parse(localStorage.getItem('cropPassportActivities') || '[]');
    activities.push(activity);
    localStorage.setItem('cropPassportActivities', JSON.stringify(activities));
  },
  createActivityId() {
    return `ACT-${Date.now().toString(36).toUpperCase()}`;
  }
};
