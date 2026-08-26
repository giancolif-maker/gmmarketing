// Persistent chat panel. Conversation history lives in localStorage so it
// survives page navigation (this is a classic multi-page app, not an SPA).
(function () {
  const STORAGE_KEY = "adbrain_chat_history";
  const panel = document.getElementById("chat-panel");
  const toggle = document.getElementById("chat-toggle");
  const closeBtn = document.getElementById("chat-close");
  const clearBtn = document.getElementById("chat-clear");
  const messagesEl = document.getElementById("chat-messages");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveHistory(history) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-40)));
  }

  function renderMessage(role, text) {
    const bubble = document.createElement("div");
    bubble.className =
      role === "user"
        ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-teal-400/90 px-3 py-2 text-slate-950"
        : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-800 px-3 py-2 text-slate-100";
    bubble.style.whiteSpace = "pre-wrap";
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderAll() {
    messagesEl.innerHTML = "";
    const history = loadHistory();
    if (history.length === 0) {
      renderMessage(
        "assistant",
        "Ask me about a campaign (“how's my streetwear campaign doing?”) or a decision (“why did you pause that ad?”) — answers come straight from your data."
      );
      return;
    }
    history.forEach((m) => renderMessage(m.role, m.text));
  }

  function setOpen(open) {
    panel.dataset.open = open ? "true" : "false";
    if (open) input.focus();
  }

  toggle.addEventListener("click", () => setOpen(panel.dataset.open !== "true"));
  closeBtn.addEventListener("click", () => setOpen(false));
  clearBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    renderAll();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";

    const history = loadHistory();
    history.push({ role: "user", text });
    saveHistory(history);
    renderMessage("user", text);

    const thinking = document.createElement("div");
    thinking.className = "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-800 px-3 py-2 text-slate-500";
    thinking.textContent = "Thinking…";
    messagesEl.appendChild(thinking);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      thinking.remove();
      if (!res.ok) {
        renderMessage("assistant", data.error || "Something went wrong.");
        return;
      }
      renderMessage("assistant", data.reply);
      const updated = loadHistory();
      updated.push({ role: "assistant", text: data.reply });
      saveHistory(updated);
      const creditEl = document.getElementById("credit-balance");
      if (creditEl && typeof data.credit_balance === "number") creditEl.textContent = data.credit_balance;
    } catch (err) {
      thinking.remove();
      renderMessage("assistant", "Couldn't reach the server — try again.");
    }
  });

  renderAll();
})();
