const crypto = require('crypto');
const config = require('../config');
const { executeTool } = require('./tools');

const TOOL_TAG_RE = /<nexus_tool>([\s\S]*?)<\/nexus_tool>/;

function isConversational(query) {
  const trimmed = query.trim();
  if (trimmed.split(/\s+/).length <= 3) return true;
  return /^(hi|hello|hey|thanks|thank you|ok|okay|sure|yes|no|bye|good(bye| morning| afternoon| evening)|how are you|what'?s up|greetings|nice|great|awesome|cool|perfect|got it|understood|noted)[\s!?.]*$/i.test(trimmed);
}

async function bufferResponse(messages) {
  const res = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, messages, stream: true }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let text = '';
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const chunk = JSON.parse(line);
        if (chunk.message?.content) text += chunk.message.content;
      } catch {}
    }
  }

  return text;
}

async function runAgentTurn({ query, agent, history }, send, waitForApproval, ragQuery) {
  const msgId = crypto.randomUUID();

  let chunks = [];
  if (!isConversational(query)) {
    const docs = agent.pinnedDocs && agent.pinnedDocs.length > 0 ? agent.pinnedDocs : null;
    chunks = await ragQuery(query, docs ? docs[0] : null) || [];
  }

  const context = chunks.map(c => `[Source: ${c.source || 'unknown'}]\n${c.text}`).join('\n\n');
  const systemPrompt = context
    ? `${agent.instructions}\n\nAnswer ONLY based on the context below.\n\nContext:\n${context}`
    : agent.instructions;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: query },
  ];

  let response = await bufferResponse(messages);
  const toolMatch = TOOL_TAG_RE.exec(response);

  if (toolMatch) {
    let parsed;
    try { parsed = JSON.parse(toolMatch[1]); } catch { parsed = null; }

    if (parsed && parsed.tool && agent.enabledTools?.includes(parsed.tool)) {
      send({ type: 'agent_approval_request', tool: parsed.tool, args: parsed.args || {}, msgId });
      const approved = await waitForApproval(parsed.tool, parsed.args || {});

      let toolResultText;
      if (approved) {
        try {
          const result = await executeTool(parsed.tool, parsed.args || {});
          if (Buffer.isBuffer(result) || result instanceof Uint8Array) {
            const b64 = Buffer.from(result).toString('base64');
            send({ type: 'agent_tool_result', tool: parsed.tool, data: b64, msgId });
            toolResultText = `[Tool Result: ${parsed.tool} completed — file ready for download]`;
          } else {
            toolResultText = `[Tool Result: ${String(result).slice(0, 3000)}]`;
          }
        } catch (err) {
          toolResultText = `[Tool Error: ${err.message}]`;
        }
      } else {
        toolResultText = '[Tool denied by user]';
      }

      history.push({ role: 'user', content: query });
      history.push({ role: 'assistant', content: response });
      history.push({ role: 'user', content: toolResultText });

      response = await bufferResponse([
        { role: 'system', content: systemPrompt },
        ...history,
      ]);
    }
  }

  send({ type: 'agent_token', token: response, msgId });
  send({ type: 'agent_done', msgId });

  if (!toolMatch) {
    history.push({ role: 'user', content: query });
    history.push({ role: 'assistant', content: response });
  }
}

module.exports = { runAgentTurn };
