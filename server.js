const path = require('path');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function parseModelJson(content) {
  const cleaned = String(content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

async function askOpenRouter(messages) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[OpenRouter] OPENROUTER_API_KEY is missing from the server environment.');
    return { error: 'AI service is not configured. Add OPENROUTER_API_KEY to .env and restart the server.', status: 500 };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(openRouterUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openrouter/free', messages, temperature: 0.2 }),
      signal: controller.signal
    });
    if (response.status === 401 || response.status === 403) {
      console.error(`[OpenRouter] Authentication failed with status ${response.status}.`);
      return { error: 'The AI service could not authenticate. Check the server configuration.', status: 502 };
    }
    if (response.status === 429) {
      console.error('[OpenRouter] Rate limit reached.');
      return { error: 'The AI service is busy. Please try again shortly.', status: 429 };
    }
    if (response.status === 404 || response.status === 422) {
      console.error(`[OpenRouter] Model unavailable with status ${response.status}.`);
      return { error: 'The configured AI model is temporarily unavailable. Please try again later.', status: 503 };
    }
    if (!response.ok) {
      console.error(`[OpenRouter] Provider request failed with status ${response.status}.`);
      return { error: 'The AI service could not complete this request. Please try again.', status: 502 };
    }
    const data = await response.json().catch(() => null);
    const parsed = parseModelJson(data?.choices?.[0]?.message?.content);
    if (!parsed) {
      console.error('[OpenRouter] Model response did not contain valid JSON.');
      return { error: 'The AI service returned an unusable response. Please try again.', status: 502 };
    }
    return { data: parsed };
  } catch (error) {
    console.error(error.name === 'AbortError' ? '[OpenRouter] Request timed out.' : `[OpenRouter] Network/provider failure: ${error.name || 'unknown error'}.`);
    return { error: error.name === 'AbortError' ? 'The AI request took too long. Please try again.' : 'Unable to reach the AI service. Please try again.', status: 503 };
  } finally {
    clearTimeout(timeout);
  }
}

app.post('/api/analyze-activity', async (req, res) => {
  const { note, harvestContext } = req.body || {};
  if (typeof note !== 'string' || !note.trim()) return res.status(400).json({ error: 'Enter a farming note before requesting analysis.' });
  const result = await askOpenRouter([
    { role: 'system', content: 'You structure producer-provided agricultural notes into traceability records. Do not diagnose disease, claim certification, invent facts, or present safety claims as verified. Return only a JSON object with category, summary, attentionLevel, and suggestedFollowUp. attentionLevel must be Routine, Monitor, or Attention.' },
    { role: 'user', content: JSON.stringify({ note: note.trim(), harvestContext: harvestContext || {} }) }
  ]);
  if (result.error) return res.status(result.status).json({ error: result.error });
  const analysis = result.data;
  const levels = ['Routine', 'Monitor', 'Attention'];
  if (typeof analysis.category !== 'string' || typeof analysis.summary !== 'string' || typeof analysis.suggestedFollowUp !== 'string' || !levels.includes(analysis.attentionLevel)) {
    console.error('[OpenRouter] Activity analysis response failed schema validation.');
    return res.status(502).json({ error: 'The AI response was incomplete. Please try again.' });
  }
  return res.json({ category: analysis.category.trim(), summary: analysis.summary.trim(), attentionLevel: analysis.attentionLevel, suggestedFollowUp: analysis.suggestedFollowUp.trim() });
});

app.post('/api/generate-traceability-summary', async (req, res) => {
  const { harvest, activities } = req.body || {};
  if (!harvest || typeof harvest !== 'object' || !Array.isArray(activities)) return res.status(400).json({ error: 'Harvest records are required to generate a summary.' });
  const result = await askOpenRouter([
    { role: 'system', content: 'Summarize only documented producer-provided agricultural traceability records for a buyer. Do not claim certification, safety, quality, or independent verification. Return only JSON: {"summary":"...","highlights":["..."]}. Keep the summary concise and use at most three factual highlights.' },
    { role: 'user', content: JSON.stringify({ harvest, activities }) }
  ]);
  if (result.error) return res.status(result.status).json({ error: result.error });
  const summary = result.data;
  if (typeof summary.summary !== 'string' || !Array.isArray(summary.highlights) || summary.highlights.some((highlight) => typeof highlight !== 'string')) {
    console.error('[OpenRouter] Traceability summary response failed schema validation.');
    return res.status(502).json({ error: 'The AI response was incomplete. Please try again.' });
  }
  return res.json({ summary: summary.summary.trim(), highlights: summary.highlights.slice(0, 3).map((highlight) => highlight.trim()) });
});

app.listen(port, () => console.log(`CropPassport AI is running at http://localhost:${port}`));
