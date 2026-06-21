const MAX = 30;
const history = [];

function addMessage(role, content) {
  history.push({ role, content });
  if (history.length > MAX) history.shift();
}

function getHistory() {
  return [...history];
}

module.exports = { addMessage, getHistory };
