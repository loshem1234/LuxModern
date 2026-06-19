// ===========================================================
// Lux-Modern Renovations — Project Intake Assistant
//
// This calls OUR OWN server at /api/chat, not Anthropic directly.
// The Anthropic API key lives only in the server's environment
// variables (set in Railway → Variables as ANTHROPIC_API_KEY) and
// is never sent to the browser. See server.js for the proxy route.
// ===========================================================

(function () {
  var messagesEl = document.getElementById("qa-messages");
  var inputEl = document.getElementById("qa-input");
  var sendBtn = document.getElementById("qa-send");

  if (!messagesEl || !inputEl || !sendBtn) return;

  var history = [
    {
      role: "assistant",
      text:
        "Evening — I'm Lux-Modern's project assistant. Tell me a bit about what you're looking to renovate or repair, and I'll help you put together the details for an accurate quote. What's on your mind?",
    },
  ];

  function renderMessages() {
    messagesEl.innerHTML = "";
    history.forEach(function (m) {
      var div = document.createElement("div");
      div.className = "qa-msg " + (m.role === "user" ? "user" : "assistant");
      div.textContent = m.text;
      messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setTyping(show) {
    var existing = document.getElementById("qa-typing-indicator");
    if (show && !existing) {
      var div = document.createElement("div");
      div.className = "qa-typing";
      div.id = "qa-typing-indicator";
      div.textContent = "typing…";
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } else if (!show && existing) {
      existing.remove();
    }
  }

  async function sendMessage() {
    var text = inputEl.value.trim();
    if (!text || sendBtn.disabled) return;

    history.push({ role: "user", text: text });
    inputEl.value = "";
    renderMessages();

    sendBtn.disabled = true;
    setTyping(true);

    try {
      var apiMessages = history.map(function (m) {
        return { role: m.role === "assistant" ? "assistant" : "user", content: m.text };
      });

      var response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      var data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Server error");
      }

      history.push({ role: "assistant", text: data.reply });
    } catch (err) {
      history.push({
        role: "assistant",
        text:
          "I'm having trouble connecting right now. Feel free to call us directly at (326) 467-0354 and we'll get your project details by phone.",
      });
    } finally {
      setTyping(false);
      sendBtn.disabled = false;
      renderMessages();
      inputEl.focus();
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendMessage();
  });

  renderMessages();
})();
