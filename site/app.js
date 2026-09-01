"use strict";

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const usd = new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const pct = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1, signDisplay: "exceptZero" });
const localTime = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
});

function text(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function timestamp(value) {
  if (!value) return "No disponible";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : localTime.format(parsed);
}

function nullablePct(value) {
  return value == null ? "—" : `${pct.format(value)} %`;
}

function renderCandidate(item, index) {
  const article = document.createElement("article");
  article.className = `candidate-card${item.signal_valid ? "" : " invalid"}`;
  article.style.animationDelay = `${Math.min(index * 35, 180)}ms`;
  const signalClass = item.signal_valid ? item.signal.toLowerCase() : "red";
  const change = item.change_from_previous || "Sin cambio de señal";
  article.innerHTML = `
    <div class="candidate-top">
      <div><div class="ticker">${item.ticker}</div><div class="company">${item.name}</div></div>
      <span class="signal signal-${signalClass}">${item.signal}${item.signal_valid ? "" : " · NO VÁLIDA"}</span>
    </div>
    <div class="price-row">
      <div class="price">${item.currency === "USD" ? usd.format(item.price) : money.format(item.price)}</div>
      <div class="delta">${change}</div>
    </div>
    <div class="metrics">
      <div class="metric"><span>Yield</span><strong>${nullablePct(item.yield_pct)}</strong></div>
      <div class="metric"><span>Margen</span><strong>${nullablePct(item.margin_of_safety_pct)}</strong></div>
      <div class="metric"><span>Data Confidence</span><strong>${item.data_confidence.base_score ?? "—"}${item.data_confidence.valid ? "" : " · INV"}</strong></div>
    </div>
    <p class="reason">${item.reason}</p>
    ${item.signal_valid ? "" : '<p class="invalid-note">Señal no utilizable por frescura o fallo del proveedor.</p>'}
  `;
  return article;
}

function render(snapshot) {
  const status = snapshot.meta.update_status;
  const statusNode = document.getElementById("general-status");
  statusNode.textContent = status;
  statusNode.className = `status status-${status.toLowerCase()}`;
  text("generated-at", timestamp(snapshot.meta.generated_at));
  text("data-as-of", snapshot.meta.data_as_of || "No disponible");
  text("next-review", timestamp(snapshot.meta.next_review_expected));
  text("economic-age", `${Math.round(snapshot.portfolio_snapshot.economic_age_hours)} h · SNAPSHOT`);
  text("green-count", String(snapshot.general.valid_green_opportunities));
  text("engine-version", snapshot.meta.engine_version);
  text("push-status", snapshot.general.mobile_notifications);
  text("candidate-count", String(snapshot.candidates.length));
  const list = document.getElementById("candidate-list");
  list.replaceChildren(...snapshot.candidates.map(renderCandidate));

  const portfolio = snapshot.portfolio_snapshot;
  text("portfolio-value", money.format(portfolio.invested_value_eur));
  text("positions-count", String(portfolio.positions_count));
  text("deployable-capital", money.format(portfolio.capital.deployable_eur));
  const positions = document.getElementById("positions");
  const rows = portfolio.positions.map(item => {
    const row = document.createElement("div");
    row.className = "position";
    row.innerHTML = `<strong>${item.ticker}</strong><span>${nullablePct(item.weight * 100)}</span><span>${money.format(item.value_eur)}</span>`;
    return row;
  });
  positions.replaceChildren(...rows);
  text("refresh-note", snapshot.meta.next_review_note);
}

function renderError() {
  const statusNode = document.getElementById("general-status");
  statusNode.textContent = "UNAVAILABLE";
  statusNode.className = "status status-unavailable";
  const list = document.getElementById("candidate-list");
  list.innerHTML = '<article class="loading-card">Snapshot no disponible. No se muestra ninguna señal como actual.</article>';
}

fetch("./data/snapshot.json", { cache: "no-store" })
  .then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(render)
  .catch(renderError);

