const CropPassportAI = {
  async request(endpoint, payload) {
    let response;
    try {
      response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } catch {
      throw new Error('Unable to reach the AI service. Please check your connection and try again.');
    }
    let data;
    try { data = await response.json(); } catch { throw new Error('The AI service returned an invalid response. Please try again.'); }
    if (!response.ok) throw new Error(data?.error || 'The AI service could not complete this request. Please try again.');
    return data;
  },
  analyzeActivity(note, harvestContext) {
    return this.request('/api/analyze-activity', { note, harvestContext });
  },
  generateTraceabilitySummary(harvest, activities) {
    return this.request('/api/generate-traceability-summary', { harvest, activities });
  },
  createFallbackTraceabilitySummary(harvest, activities) {
    return {
      summary: `AI-generated summary of the producer-provided traceability records. ${harvest.harvestName} is recorded as ${harvest.cropVariety} ${harvest.cropName} from ${harvest.farmLocation}, with ${activities.length} documented field activit${activities.length === 1 ? 'y' : 'ies'}.`,
      highlights: [
        `${harvest.cropName} ${harvest.cropVariety} recorded for ${harvest.farmLocation}.`,
        `${activities.length} producer-provided field activities documented.`
      ]
    };
  }
};
