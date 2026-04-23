// src/utils/Leaderboard.js
const KEY = 'spaceninja_scores';

export function saveScore(name, score) {
  const scores = getScores();
  scores.push({ name, score, date: Date.now() });
  scores.sort((a, b) => b.score - a.score);
  const top10 = scores.slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(top10));
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
