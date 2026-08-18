const fs = require('fs');

const questions = [
  { id: 1, category: "Administrasi" },
  { id: 2, category: "Administrasi" },
  { id: 3, category: "Administrasi" }
];

const quizSettings = {
  counts: { "Administrasi": 2 }
};

const grouped = {};
questions.forEach(q => {
  if (!grouped[q.category]) grouped[q.category] = [];
  grouped[q.category].push(q);
});

let selectedIds = [];
Object.keys(quizSettings.counts).forEach(cat => {
  const count = quizSettings.counts[cat];
  const catQs = grouped[cat] || [];
  const shuffled = catQs.sort(() => 0.5 - Math.random());
  const picked = shuffled.slice(0, count).map(q => q.id);
  selectedIds = [...selectedIds, ...picked];
});

console.log(selectedIds);
