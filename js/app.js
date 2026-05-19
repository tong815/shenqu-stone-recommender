/**
 * 强化石等级推荐器 — 网页 UI
 */
const REPO_SLUG = "tong815/shenqu-stone-recommender";

const $ = (id) => document.getElementById(id);

let chart = null;

function fmt6(n) {
  return Number(n).toFixed(6);
}

function curveDataset() {
  return {
    label: "C(d) 模型曲线",
    data: D_GRID.map((d, i) => ({ x: d, y: C_GRID[i] })),
    borderColor: "#2563eb",
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.15,
  };
}

function lineDataset(label, x1, y1, x2, y2, color, dash) {
  return {
    label,
    data: [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ],
    borderColor: color,
    borderWidth: label.includes("推荐") ? 2 : 1.5,
    borderDash: dash || [],
    pointRadius: 0,
    fill: false,
  };
}

function initChart() {
  const ctx = $("chart-c").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: { datasets: [curveDataset()] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      scales: {
        x: {
          type: "linear",
          min: D_MIN,
          max: D_MAX,
          title: { display: true, text: "强化石等级 d" },
        },
        y: {
          title: { display: true, text: "C(d), 单位 k" },
        },
      },
      plugins: {
        legend: { position: "top", labels: { boxWidth: 12 } },
      },
    },
  });
}

function updateChartMarkers(input_C, recommended_d) {
  const yMin = Math.min(...C_GRID);
  const yMax = Math.max(input_C, ...C_GRID) * 1.05;

  chart.data.datasets = [
    curveDataset(),
    lineDataset(`输入 C=${input_C}`, D_MIN, input_C, D_MAX, input_C, "#dc2626", [6, 4]),
    lineDataset(`推荐 d=${recommended_d}`, recommended_d, yMin, recommended_d, yMax, "#9333ea", []),
  ];
  chart.options.scales.y.suggestedMax = yMax;
  chart.update();
}

function renderCandidateTable(candidates, recommended_d) {
  const tbody = $("candidate-tbody");
  tbody.innerHTML = candidates
    .map((row) => {
      const chosen = row.d === recommended_d ? ' class="row-chosen"' : "";
      const tag = row.tag ? ` (${row.tag})` : "";
      return `<tr${chosen}>
        <td>${row.d}</td>
        <td>${fmt6(row.p)}</td>
        <td>${fmt6(row.e_success)}</td>
        <td>${fmt6(row.model_c)}</td>
        <td>${row.d === recommended_d ? "✓ 选用" : ""}${tag}</td>
      </tr>`;
    })
    .join("");
}

function showResults(r) {
  $("d-highlight").textContent = String(r.recommended_d);
  $("out-input-c").textContent = fmt6(r.input_C);
  $("out-p-rec").textContent = fmt6(r.p_rec);
  $("out-e-rec").textContent = fmt6(r.e_rec);
  $("out-model-c").textContent = fmt6(r.model_c_rec);
  renderCandidateTable(r.candidates, r.recommended_d);
  updateChartMarkers(r.input_C, r.recommended_d);
}

function onCalculate() {
  const raw = $("input-c").value.trim();
  if (!raw) {
    alert("请输入强化花费 C。");
    return;
  }
  const input_C = Number(raw);
  if (!Number.isFinite(input_C)) {
    alert(`请输入有效数字，当前输入：${raw}`);
    return;
  }
  if (input_C < 0) {
    alert("警告：C < 0，已按模型边界处理（d_cont 取 1）。");
  }
  showResults(computeRecommendation(input_C));
}

document.addEventListener("DOMContentLoaded", () => {
  if (REPO_SLUG && !REPO_SLUG.startsWith("YOUR_")) {
    $("repo-link").href = `https://github.com/${REPO_SLUG}`;
  }
  initChart();
  $("btn-calc").addEventListener("click", onCalculate);
  $("input-c").addEventListener("keydown", (e) => {
    if (e.key === "Enter") onCalculate();
  });
});
