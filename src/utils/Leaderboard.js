// src/utils/Leaderboard.js

// ── Google Sheets ────────────────────────────────────────────────────────────
// URL du Google Apps Script déployé en "Web App" (mode Anyone, exécuté en tant que vous).
// Remplacer cette valeur par l'URL obtenue après déploiement.
const SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycby3NBiFMpXte4nhO0-ZuNSX8ACmPABwFD6pJ548IHL4IjHisfEb0aTJiPlHNGWrrUBk4w/exec';

async function _sendToSheets(name, score) {
  if (!SHEETS_ENDPOINT || SHEETS_ENDPOINT.startsWith('REMPLACER')) return;
  try {
    // GET + query params : seule méthode fiable avec Apps Script en no-cors
    // (pas de preflight, pas de restriction sur les headers)
    const url = `${SHEETS_ENDPOINT}?name=${encodeURIComponent(name)}&score=${encodeURIComponent(score)}&date=${Date.now()}`;
    await fetch(url, { method: 'GET', mode: 'no-cors' });
  } catch (err) {
    console.warn('[Leaderboard] Envoi Google Sheets échoué :', err);
  }
}

export async function getScoresFromSheets() {
  if (!SHEETS_ENDPOINT || SHEETS_ENDPOINT.startsWith('REMPLACER')) return [];
  try {
    const res  = await fetch(`${SHEETS_ENDPOINT}?action=scores&_t=${Date.now()}`, { credentials: 'omit' });
    const text = await res.text();
    console.log('[Leaderboard] Sheets brut :', text);
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[Leaderboard] getScoresFromSheets échoué :', err);
    return [];
  }
}

// ── Local storage ────────────────────────────────────────────────────────────
const KEY = 'spaceninja_scores';

export function saveScore(name, score) {
  const scores = getScores();
  scores.push({ name, score, date: Date.now() });
  scores.sort((a, b) => b.score - a.score);
  const top10 = scores.slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(top10));

  // Envoi asynchrone vers Google Sheets (sans bloquer le jeu)
  _sendToSheets(name, score);

  return top10;
}

export function getScores() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function clearScores() {
  localStorage.removeItem(KEY);
}
