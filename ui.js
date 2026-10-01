import {
  calculateFlightTime,
  calculateMaximumHeight,
  calculatePosition,
  calculateRange,
} from "./physics.js";

const app = document.querySelector("#app");
const contentResponse = await fetch(new URL("./content.json", import.meta.url));

if (!contentResponse.ok) {
  throw new Error(`Could not load content.json: ${contentResponse.status}`);
}

const content = await contentResponse.json();
const numberFormat = new Intl.NumberFormat("sv-SE", {
  maximumFractionDigits: 2,
});
const svgNamespace = "http://www.w3.org/2000/svg";
const plot = {
  width: 960,
  height: 540,
  left: 88,
  right: 34,
  top: 38,
  bottom: 78,
};

let state = "ready";
let elapsedSeconds = 0;
let runStartedAt = 0;
let animationRequest = null;
const shots = [];
let showPreview = true;

function element(tagName, className, text) {
  const item = document.createElement(tagName);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

function svgElement(tagName, attributes = {}, text) {
  const item = document.createElementNS(svgNamespace, tagName);
  for (const [name, value] of Object.entries(attributes)) {
    item.setAttribute(name, value);
  }
  if (text !== undefined) item.textContent = text;
  return item;
}

function formatMeasurement(value, unit) {
  return `${numberFormat.format(value)} ${unit}`;
}

function formatTick(value) {
  return numberFormat.format(value);
}

function trajectoryColor(index) {
  const hue = (index * 137.508 + 153) % 360;
  return `hsl(${hue} 62% 36%)`;
}

document.title = content.title;
document.querySelector('meta[name="description"]').content = content.introduction;

const pageHeader = element("header", "page-header");
pageHeader.append(
  element("h1", "page-title", content.title),
  element("p", "page-introduction", content.introduction),
);

const workspace = element("div", "workspace");
const controlPanel = element("section", "control-panel");
const controlHeading = element("h2", "section-heading", content.controls.heading);
controlPanel.setAttribute("aria-labelledby", "controls-heading");
controlHeading.id = "controls-heading";
controlPanel.append(controlHeading);

const settings = content.settings;
const maximumSpeedMps = Number(settings.initialSpeed.max);
const angleLimits = [
  Number(settings.launchAngle.min),
  Number(settings.launchAngle.max),
];
const maximumRangeAngle = Math.min(Math.max(45, angleLimits[0]), angleLimits[1]);
const chartDomain = {
  horizontalMeters: Math.max(
    calculateRange(maximumSpeedMps, maximumRangeAngle) * 1.12,
    5,
  ),
  verticalMeters:
    Math.max(
      ...angleLimits.map((angle) => calculateMaximumHeight(maximumSpeedMps, angle)),
    ) * 1.28,
};
const initialSpeedControl = createRangeControl(
  "initial-speed",
  content.quantities.initialSpeed,
  settings.initialSpeed,
);
const launchAngleControl = createRangeControl(
  "launch-angle",
  content.quantities.launchAngle,
  settings.launchAngle,
);
controlPanel.append(initialSpeedControl.container, launchAngleControl.container);

const buttonRow = element("div", "button-row");
const startButton = element("button", "action-button action-primary", content.controls.start);
const pauseButton = element("button", "action-button", content.controls.pause);
const resetButton = element("button", "action-button action-reset", content.controls.reset);
startButton.type = "button";
pauseButton.type = "button";
resetButton.type = "button";
pauseButton.disabled = true;
buttonRow.append(startButton, pauseButton, resetButton);

const status = element("p", "simulation-status", content.status.ready);
status.setAttribute("aria-live", "polite");
status.setAttribute("aria-atomic", "true");
controlPanel.append(buttonRow, status);

const readoutSection = element("section", "readout-section");
readoutSection.setAttribute("aria-labelledby", "readout-heading");
const readoutHeading = element("h2", "section-heading", content.readouts.heading);
readoutHeading.id = "readout-heading";
const readouts = element("dl", "readouts");
const outputElements = {
  time: addReadout(readouts, "elapsedTime", content.quantities.elapsedTime),
  horizontalPosition: addReadout(
    readouts,
    "horizontalPosition",
    content.quantities.horizontalPosition,
  ),
  verticalPosition: addReadout(
    readouts,
    "verticalPosition",
    content.quantities.verticalPosition,
  ),
  range: addReadout(readouts, "range", content.quantities.range),
};
readoutSection.append(readoutHeading, readouts);
controlPanel.append(readoutSection);

const visualization = element("div", "visualization");
const chartSection = element("section", "chart-section");
chartSection.setAttribute("aria-labelledby", "chart-heading");
const chartHeading = element("h2", "section-heading chart-heading", content.graph.heading);
chartHeading.id = "chart-heading";
const chart = svgElement("svg", {
  class: "trajectory-chart",
  viewBox: `0 0 ${plot.width} ${plot.height}`,
  role: "img",
  "aria-labelledby": "trajectory-title trajectory-description",
  preserveAspectRatio: "xMidYMid meet",
});
const chartTitle = svgElement("title", { id: "trajectory-title" }, content.graph.accessibleTitle);
const chartDescription = svgElement(
  "desc",
  { id: "trajectory-description" },
  content.graph.accessibleDescription,
);
chart.append(chartTitle, chartDescription);
const trajectoryLegend = element("ul", "trajectory-legend");
trajectoryLegend.setAttribute("aria-label", content.graph.legendLabel);
chartSection.append(chartHeading, chart, trajectoryLegend);

const modelSection = element("section", "model-section");
modelSection.setAttribute("aria-labelledby", "model-heading");
const modelHeading = element("h2", "section-heading model-heading", content.model.heading);
modelHeading.id = "model-heading";
const modelCopy = element("div", "model-copy");
modelCopy.append(
  element("p", "model-description", content.model.description),
  element("p", "model-explanation", content.model.explanation),
  element("p", "model-comparison", content.model.angleComparison),
);
const assumptions = element("ul", "assumptions");
for (const assumption of content.model.assumptions) {
  assumptions.append(element("li", "", assumption));
}
modelSection.append(modelHeading, modelCopy, assumptions);
visualization.append(chartSection, modelSection);
workspace.append(controlPanel, visualization);
app.replaceChildren(pageHeader, workspace);
app.setAttribute("aria-busy", "false");

initialSpeedControl.input.addEventListener("input", handleSettingsChange);
launchAngleControl.input.addEventListener("input", handleSettingsChange);
startButton.addEventListener("click", startMotion);
pauseButton.addEventListener("click", pauseMotion);
resetButton.addEventListener("click", resetMotion);

render();

function createRangeControl(id, quantity, configuration) {
  const container = element("div", "slider-field");
  const heading = element("div", "slider-heading");
  const label = element("label", "slider-label", quantity.label);
  const output = element("output", "slider-value");
  const input = element("input", "slider-input");

  input.type = "range";
  input.id = id;
  input.min = configuration.min;
  input.max = configuration.max;
  input.step = configuration.step;
  input.value = configuration.initial;
  label.htmlFor = id;
  output.htmlFor = id;
  input.setAttribute("aria-label", `${quantity.label} (${quantity.unit})`);
  heading.append(label, output);
  container.append(heading, input);

  return { container, input, output, quantity };
}

function addReadout(parent, key, quantity) {
  const item = element("div", "readout");
  const term = element("dt", "readout-label", quantity.label);
  const value = element("dd", "readout-value");
  value.id = `value-${key}`;
  item.append(term, value);
  parent.append(item);
  return value;
}

function getSettings() {
  return {
    initialSpeedMps: Number(initialSpeedControl.input.value),
    launchAngleDegrees: Number(launchAngleControl.input.value),
  };
}

function handleSettingsChange() {
  stopAnimation();
  elapsedSeconds = 0;
  state = "ready";
  showPreview = true;
  render();
}

function startMotion() {
  if (state === "running" || state === "landed") return;

  const { initialSpeedMps, launchAngleDegrees } = getSettings();
  if (state === "ready") {
    shots.push({
      initialSpeedMps,
      launchAngleDegrees,
      color: trajectoryColor(shots.length),
    });
    showPreview = false;
  }

  const flightTime = calculateFlightTime(initialSpeedMps, launchAngleDegrees);
  if (flightTime <= 0) {
    state = "landed";
    render();
    return;
  }

  state = "running";
  runStartedAt = performance.now() - elapsedSeconds * 1000;
  animationRequest = requestAnimationFrame(animate);
  render();
}

function pauseMotion() {
  if (state !== "running") return;

  const { initialSpeedMps, launchAngleDegrees } = getSettings();
  const flightTime = calculateFlightTime(initialSpeedMps, launchAngleDegrees);
  elapsedSeconds = Math.min(flightTime, (performance.now() - runStartedAt) / 1000);
  stopAnimation();
  state = elapsedSeconds >= flightTime ? "landed" : "paused";
  render();
}

function resetMotion() {
  stopAnimation();
  elapsedSeconds = 0;
  state = "ready";
  showPreview = true;
  render();
}

function stopAnimation() {
  if (animationRequest !== null) {
    cancelAnimationFrame(animationRequest);
    animationRequest = null;
  }
}

function animate(timestamp) {
  const { initialSpeedMps, launchAngleDegrees } = getSettings();
  const flightTime = calculateFlightTime(initialSpeedMps, launchAngleDegrees);
  elapsedSeconds = Math.min(flightTime, (timestamp - runStartedAt) / 1000);

  if (elapsedSeconds >= flightTime) {
    state = "landed";
    animationRequest = null;
  }

  render();
  if (state === "running") {
    animationRequest = requestAnimationFrame(animate);
  }
}

function render() {
  const { initialSpeedMps, launchAngleDegrees } = getSettings();
  const rangeMeters = calculateRange(initialSpeedMps, launchAngleDegrees);
  const position = calculatePosition(initialSpeedMps, launchAngleDegrees, elapsedSeconds);
  const verticalPosition = state === "landed" ? 0 : Math.max(0, position.yMeters);

  initialSpeedControl.output.textContent = formatMeasurement(
    initialSpeedMps,
    initialSpeedControl.quantity.unit,
  );
  launchAngleControl.output.textContent = formatMeasurement(
    launchAngleDegrees,
    launchAngleControl.quantity.unit,
  );
  outputElements.time.textContent = formatMeasurement(
    elapsedSeconds,
    content.quantities.elapsedTime.unit,
  );
  outputElements.horizontalPosition.textContent = formatMeasurement(
    position.xMeters,
    content.quantities.horizontalPosition.unit,
  );
  outputElements.verticalPosition.textContent = formatMeasurement(
    verticalPosition,
    content.quantities.verticalPosition.unit,
  );
  outputElements.range.textContent = formatMeasurement(
    rangeMeters,
    content.quantities.range.unit,
  );

  const statusText = content.status[state];
  if (status.textContent !== statusText) status.textContent = statusText;
  startButton.disabled = state === "running" || state === "landed";
  pauseButton.disabled = state !== "running";
  chartDescription.textContent = shots.length > 0
    ? `${content.graph.accessibleDescription} ${content.graph.historyDescription}`
    : content.graph.accessibleDescription;

  drawChart({
    initialSpeedMps,
    launchAngleDegrees,
    rangeMeters,
    currentX: position.xMeters,
    currentY: verticalPosition,
    trajectories: shots,
    showPreview,
  });
  renderLegend();
}

function drawChart({
  initialSpeedMps,
  launchAngleDegrees,
  rangeMeters,
  currentX,
  currentY,
  trajectories,
  showPreview: shouldShowPreview,
}) {
  const left = plot.left;
  const right = plot.width - plot.right;
  const top = plot.top;
  const bottom = plot.height - plot.bottom;
  const plotWidth = right - left;
  const plotHeight = bottom - top;
  const xMaximum = chartDomain.horizontalMeters;
  const yMaximum = Math.max(chartDomain.verticalMeters, 4);
  const toX = (xMeters) => left + (xMeters / xMaximum) * plotWidth;
  const toY = (yMeters) => bottom - (yMeters / yMaximum) * plotHeight;

  chart.replaceChildren(chartTitle, chartDescription);

  for (let tick = 0; tick <= 4; tick += 1) {
    const x = left + (plotWidth * tick) / 4;
    const y = top + (plotHeight * tick) / 4;
    const xValue = (xMaximum * tick) / 4;
    const yValue = yMaximum * (1 - tick / 4);

    chart.append(
      svgElement("line", { class: "grid-line", x1: x, y1: top, x2: x, y2: bottom }),
      svgElement("line", { class: "grid-line", x1: left, y1: y, x2: right, y2: y }),
      svgElement(
        "text",
        { class: "tick-label x-tick", x, y: bottom + 24, "text-anchor": "middle" },
        formatTick(xValue),
      ),
      svgElement(
        "text",
        { class: "tick-label y-tick", x: left - 15, y: y + 4, "text-anchor": "end" },
        formatTick(yValue),
      ),
    );
  }

  chart.append(
    svgElement("line", { class: "ground-line", x1: left, y1: bottom, x2: right, y2: bottom }),
    svgElement(
      "text",
      { class: "ground-label", x: right, y: bottom + 47, "text-anchor": "end" },
      content.graph.groundLine,
    ),
    svgElement(
      "text",
      { class: "axis-label", x: left + plotWidth / 2, y: plot.height - 13, "text-anchor": "middle" },
      `${content.quantities.horizontalPosition.label} (${content.quantities.horizontalPosition.unit})`,
    ),
    svgElement(
      "text",
      {
        class: "axis-label",
        x: 23,
        y: top + plotHeight / 2,
        "text-anchor": "middle",
        transform: `rotate(-90 23 ${top + plotHeight / 2})`,
      },
      `${content.quantities.verticalPosition.label} (${content.quantities.verticalPosition.unit})`,
    ),
  );

  const plottedTrajectories = trajectories.map((shot) => ({ ...shot, preview: false }));
  if (shouldShowPreview) {
    plottedTrajectories.push({
      ...getSettings(),
      color: trajectoryColor(trajectories.length),
      preview: true,
    });
  }

  const pathPointCount = 100;
  for (const shot of plottedTrajectories) {
    const shotFlightTime = calculateFlightTime(
      shot.initialSpeedMps,
      shot.launchAngleDegrees,
    );
    const shotRange = calculateRange(shot.initialSpeedMps, shot.launchAngleDegrees);
    const pathData = Array.from({ length: pathPointCount + 1 }, (_, index) => {
      const time = (shotFlightTime * index) / pathPointCount;
      const point = calculatePosition(
        shot.initialSpeedMps,
        shot.launchAngleDegrees,
        time,
      );
      return `${index === 0 ? "M" : "L"} ${toX(point.xMeters)} ${toY(Math.max(0, point.yMeters))}`;
    }).join(" ");

    const trajectoryPath = svgElement("path", {
      class: shot.preview ? "trajectory-line trajectory-preview" : "trajectory-line",
      d: pathData,
    });
    trajectoryPath.style.stroke = shot.color;
    const landingMarker = svgElement("circle", {
      class: "trajectory-endpoint",
      cx: toX(shotRange),
      cy: toY(0),
      r: 5,
    });
    landingMarker.style.fill = shot.color;
    chart.append(trajectoryPath, landingMarker);
  }

  chart.append(
    svgElement("circle", { class: "launch-point", cx: toX(0), cy: toY(0), r: 5 }),
    svgElement(
      "text",
      { class: "point-label", x: toX(0) + 10, y: toY(0) - 12 },
      content.graph.launchPoint,
    ),
    svgElement(
      "circle",
      { class: "projectile", cx: toX(currentX), cy: toY(currentY), r: 8 },
    ),
    svgElement(
      "circle",
      { class: "landing-point", cx: toX(rangeMeters), cy: toY(0), r: 5 },
    ),
    svgElement(
      "text",
      {
        class: "point-label landing-label",
        x: toX(rangeMeters) - 10,
        y: toY(0) - 12,
        "text-anchor": "end",
      },
      content.graph.landingPoint,
    ),
  );
}

function renderLegend() {
  const entries = shots.map((shot, index) => ({
    color: shot.color,
    label: `${content.graph.shotLabel} ${index + 1} · ${formatMeasurement(
      shot.initialSpeedMps,
      content.quantities.initialSpeed.unit,
    )} · ${formatMeasurement(
      shot.launchAngleDegrees,
      content.quantities.launchAngle.unit,
    )}`,
  }));

  if (showPreview) {
    const currentSettings = getSettings();
    entries.push({
      color: trajectoryColor(shots.length),
      label: `${content.graph.previewLabel} · ${formatMeasurement(
        currentSettings.initialSpeedMps,
        content.quantities.initialSpeed.unit,
      )} · ${formatMeasurement(
        currentSettings.launchAngleDegrees,
        content.quantities.launchAngle.unit,
      )}`,
    });
  }

  trajectoryLegend.replaceChildren();
  for (const entry of entries) {
    const item = element("li", "legend-entry");
    const swatch = element("span", "legend-swatch");
    swatch.setAttribute("aria-hidden", "true");
    swatch.style.backgroundColor = entry.color;
    item.append(swatch, element("span", "", entry.label));
    trajectoryLegend.append(item);
  }
}