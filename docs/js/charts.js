/**
 * Phase 1 Survivor — Chart Rendering
 */

const COLORS = {
  completed: '#4ecca3',
  terminated: '#e94560',
  withdrawn: '#f5a623',
  phases: ['#e94560', '#f5a623', '#4ecca3', '#3282b8'],
  heatmap: [
    [0, '#1a1a2e'],
    [0.3, '#0f3460'],
    [0.5, '#3282b8'],
    [0.7, '#4ecca3'],
    [1, '#2ecc71']
  ]
};

const LAYOUT_DEFAULTS = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { family: 'Inter, system-ui, sans-serif', color: '#e0e0e0' },
  margin: { t: 40, r: 20, b: 50, l: 60 },
  hoverlabel: { bgcolor: '#16213e', bordercolor: '#e94560', font: { color: '#e0e0e0' } }
};

const CONFIG = { responsive: true, displayModeBar: false };

async function fetchJSON(path) {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`Failed to fetch ${path}`);
  return resp.json();
}

function showLoading(id) {
  document.getElementById(id).innerHTML = '<div class="loading">Loading data</div>';
}

function clearLoading(id) {
  document.getElementById(id).innerHTML = '';
}

// ── Chart 1: Success Rate by Phase ──
async function renderPhaseChart() {
  const id = 'phase-chart';
  showLoading(id);

  try {
    const data = await fetchJSON('data/phase_rates.json');
    clearLoading(id);

    const phases = Object.keys(data);
    const completed = phases.map(p => data[p].completed);
    const terminated = phases.map(p => data[p].terminated);
    const withdrawn = phases.map(p => data[p].withdrawn);
    const totals = phases.map(p => data[p].total);

    // Update stat cards
    const avgCompletion = (completed.reduce((a, b) => a + b, 0) / completed.length).toFixed(1);
    const totalTrials = totals.reduce((a, b) => a + b, 0);
    const worstPhase = phases[completed.indexOf(Math.min(...completed))];
    const bestPhase = phases[completed.indexOf(Math.max(...completed))];

    document.getElementById('stat-avg-completion').textContent = avgCompletion + '%';
    document.getElementById('stat-total-trials').textContent = totalTrials.toLocaleString();
    document.getElementById('stat-worst-phase').textContent = worstPhase;
    document.getElementById('stat-best-phase').textContent = bestPhase;

    const traces = [
      {
        x: phases, y: completed, name: 'Completed',
        type: 'bar', marker: { color: COLORS.completed, cornerradius: 4 },
        text: completed.map(v => v + '%'), textposition: 'outside',
        hovertemplate: '%{x}<br>Completed: %{y}%<extra></extra>'
      },
      {
        x: phases, y: terminated, name: 'Terminated',
        type: 'bar', marker: { color: COLORS.terminated, cornerradius: 4 },
        text: terminated.map(v => v + '%'), textposition: 'outside',
        hovertemplate: '%{x}<br>Terminated: %{y}%<extra></extra>'
      },
      {
        x: phases, y: withdrawn, name: 'Withdrawn',
        type: 'bar', marker: { color: COLORS.withdrawn, cornerradius: 4 },
        text: withdrawn.map(v => v + '%'), textposition: 'outside',
        hovertemplate: '%{x}<br>Withdrawn: %{y}%<extra></extra>'
      }
    ];

    const layout = {
      ...LAYOUT_DEFAULTS,
      barmode: 'group',
      yaxis: { title: 'Rate (%)', gridcolor: 'rgba(255,255,255,0.05)', range: [0, 85] },
      xaxis: { gridcolor: 'rgba(255,255,255,0.05)' },
      legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center' },
      annotations: phases.map((p, i) => ({
        x: p, y: -8, text: `n=${totals[i]}`, showarrow: false,
        font: { size: 11, color: '#6c6c80' }, xref: 'x', yref: 'y'
      }))
    };

    Plotly.newPlot(id, traces, layout, CONFIG);
  } catch (e) {
    document.getElementById(id).innerHTML = '<p style="color:#e94560;text-align:center;">Failed to load phase data</p>';
    console.error(e);
  }
}

// ── Chart 2: Success Rate by Modality ──
async function renderModalityChart() {
  const id = 'modality-chart';
  showLoading(id);

  try {
    const data = await fetchJSON('data/modality_rates.json');
    clearLoading(id);

    const modalities = Object.keys(data);
    const completed = modalities.map(m => data[m].completed);
    const terminated = modalities.map(m => data[m].terminated);
    const withdrawn = modalities.map(m => data[m].withdrawn);
    const totals = modalities.map(m => data[m].total);

    // Sort by completion rate
    const indices = completed.map((_, i) => i).sort((a, b) => completed[b] - completed[a]);
    const sorted = (arr) => indices.map(i => arr[i]);

    const traces = [
      {
        x: sorted(modalities), y: sorted(completed), name: 'Completed',
        type: 'bar', marker: { color: COLORS.completed, cornerradius: 4 },
        text: sorted(completed).map(v => v + '%'), textposition: 'outside',
        hovertemplate: '%{x}<br>Completed: %{y}%<extra></extra>'
      },
      {
        x: sorted(modalities), y: sorted(terminated), name: 'Terminated',
        type: 'bar', marker: { color: COLORS.terminated, cornerradius: 4 },
        text: sorted(terminated).map(v => v + '%'), textposition: 'outside',
        hovertemplate: '%{x}<br>Terminated: %{y}%<extra></extra>'
      },
      {
        x: sorted(modalities), y: sorted(withdrawn), name: 'Withdrawn',
        type: 'bar', marker: { color: COLORS.withdrawn, cornerradius: 4 },
        text: sorted(withdrawn).map(v => v + '%'), textposition: 'outside',
        hovertemplate: '%{x}<br>Withdrawn: %{y}%<extra></extra>'
      }
    ];

    const layout = {
      ...LAYOUT_DEFAULTS,
      barmode: 'group',
      yaxis: { title: 'Rate (%)', gridcolor: 'rgba(255,255,255,0.05)', range: [0, 85] },
      xaxis: { gridcolor: 'rgba(255,255,255,0.05)' },
      legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center' },
      annotations: sorted(modalities).map((m, i) => ({
        x: m, y: -8, text: `n=${sorted(totals)[i]}`, showarrow: false,
        font: { size: 11, color: '#6c6c80' }, xref: 'x', yref: 'y'
      }))
    };

    Plotly.newPlot(id, traces, layout, CONFIG);
  } catch (e) {
    document.getElementById(id).innerHTML = '<p style="color:#e94560;text-align:center;">Failed to load modality data</p>';
    console.error(e);
  }
}

// ── Chart 3: Heatmap ──
async function renderHeatmap() {
  const id = 'heatmap-chart';
  showLoading(id);

  try {
    const data = await fetchJSON('data/heatmap_data.json');
    clearLoading(id);

    const conditions = Object.keys(data);
    const phases = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];

    const z = conditions.map(c => phases.map(p => data[c][p]?.completed || 0));
    const hoverText = conditions.map(c =>
      phases.map(p => {
        const d = data[c][p];
        return d ? `${c} — ${p}<br>Completed: ${d.completed}%<br>Terminated: ${d.terminated}%<br>n=${d.total}` : '';
      })
    );

    const trace = {
      z: z,
      x: phases,
      y: conditions,
      type: 'heatmap',
      colorscale: COLORS.heatmap,
      hoverinfo: 'text',
      text: hoverText,
      zmin: 35,
      zmax: 80,
      colorbar: {
        title: { text: 'Completion %', side: 'right', font: { size: 12 } },
        tickfont: { color: '#a0a0b0' },
        len: 0.9
      }
    };

    const layout = {
      ...LAYOUT_DEFAULTS,
      margin: { t: 20, r: 80, b: 60, l: 130 },
      yaxis: { autorange: 'reversed', tickfont: { size: 11 } },
      xaxis: { side: 'bottom' }
    };

    Plotly.newPlot(id, [trace], layout, CONFIG);
  } catch (e) {
    document.getElementById(id).innerHTML = '<p style="color:#e94560;text-align:center;">Failed to load heatmap data</p>';
    console.error(e);
  }
}

// ── Chart 4: Timeline Trend ──
async function renderTimeline() {
  const id = 'timeline-chart';
  showLoading(id);

  try {
    const data = await fetchJSON('data/timeline_data.json');
    clearLoading(id);

    const phases = Object.keys(data);
    const traces = phases.map((phase, i) => {
      const periods = Object.keys(data[phase]);
      const midpoints = periods.map(p => {
        const [start] = p.split('-');
        return parseInt(start) + 1;
      });
      const completed = periods.map(p => data[phase][p].completed);

      return {
        x: midpoints,
        y: completed,
        name: phase,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: COLORS.phases[i], width: 2.5, shape: 'spline' },
        marker: { size: 6, color: COLORS.phases[i] },
        hovertemplate: `${phase}<br>Period: %{text}<br>Completion: %{y}%<extra></extra>`,
        text: periods
      };
    });

    const layout = {
      ...LAYOUT_DEFAULTS,
      xaxis: {
        title: 'Year',
        gridcolor: 'rgba(255,255,255,0.05)',
        dtick: 2
      },
      yaxis: {
        title: 'Completion Rate (%)',
        gridcolor: 'rgba(255,255,255,0.05)',
        range: [38, 78]
      },
      legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center' }
    };

    Plotly.newPlot(id, traces, layout, CONFIG);
  } catch (e) {
    document.getElementById(id).innerHTML = '<p style="color:#e94560;text-align:center;">Failed to load timeline data</p>';
    console.error(e);
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  renderPhaseChart();
  renderModalityChart();
  renderHeatmap();
  renderTimeline();
});
