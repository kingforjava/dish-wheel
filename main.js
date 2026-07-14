const STORAGE_KEY = "dish-wheel-items";
const DEFAULT_DISHES = ["干煸四季豆","干锅牛肉","炒时蔬","豆干肉丝","蒜苗回锅肉"];

const palette = [
  "#ff6b2c",
  "#2f6b4f",
  "#e8a838",
  "#3d5a80",
  "#c45c26",
  "#5c7c4a",
  "#d97757",
  "#4a6fa5",
  "#b85c38",
  "#6b8f71",
];

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const dishForm = document.getElementById("dishForm");
const dishInput = document.getElementById("dishInput");
const dishList = document.getElementById("dishList");
const clearBtn = document.getElementById("clearBtn");
const result = document.getElementById("result");
const resultName = document.getElementById("resultName");

let dishes = loadDishes();
let rotation = 0;
let spinning = false;
let animId = null;

function loadDishes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_DISHES];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_DISHES];
  } catch {
    return [...DEFAULT_DISHES];
  }
}

function saveDishes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dishes));
}

function normalizeText(value) {
  return value.trim().replace(/\s+/g, " ");
}

function drawWheel() {
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 10;
  const count = Math.max(dishes.length, 1);

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(rotation);

  if (!dishes.length) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#2a221c";
    ctx.fill();
    ctx.strokeStyle = "rgba(246,239,228,0.2)";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.rotate(-rotation);
    ctx.fillStyle = "#b9a995";
    ctx.font = '28px "ZCOOL XiaoWei", serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("添加菜品", 0, 0);
    ctx.restore();
    return;
  }

  const slice = (Math.PI * 2) / count;

  for (let i = 0; i < count; i++) {
    const start = i * slice - Math.PI / 2;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = palette[i % palette.length];
    ctx.fill();

    ctx.strokeStyle = "rgba(20,17,15,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.rotate(start + slice / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f6efe4";
    ctx.font = `bold ${Math.min(28, Math.max(16, 220 / count))}px "Noto Sans SC", sans-serif`;
    const label = dishes[i].length > 8 ? dishes[i].slice(0, 8) + "…" : dishes[i];
    ctx.fillText(label, radius - 24, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(246,239,228,0.55)";
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius - 14, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(20,17,15,0.25)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}

function renderList() {
  dishList.innerHTML = "";
  dishes.forEach((name, index) => {
    const li = document.createElement("li");
    li.className = "dish-chip";

    const label = document.createElement("span");
    label.textContent = name;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", `删除 ${name}`);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      if (spinning) return;
      dishes.splice(index, 1);
      saveDishes();
      refresh();
      if (!dishes.length) {
        result.classList.remove("is-reveal");
        resultName.textContent = "先加几道菜吧";
      }
    });

    li.append(label, removeBtn);
    dishList.appendChild(li);
  });
}

function refresh() {
  renderList();
  drawWheel();
  spinBtn.disabled = spinning || dishes.length < 2;
}

function getSelectedIndex() {
  const count = dishes.length;
  if (!count) return -1;
  const slice = (Math.PI * 2) / count;
  const normalized = ((Math.PI * 2) - (rotation % (Math.PI * 2))) % (Math.PI * 2);
  return Math.floor(normalized / slice) % count;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function spin() {
  if (spinning || dishes.length < 2) return;

  spinning = true;
  canvas.classList.add("spinning");
  spinBtn.disabled = true;
  spinBtn.textContent = "转…";
  result.classList.remove("is-reveal");
  resultName.textContent = "转动中…";

  const count = dishes.length;
  const slice = (Math.PI * 2) / count;
  const targetIndex = Math.floor(Math.random() * count);
  const extraTurns = 4 + Math.floor(Math.random() * 3);
  const targetAngle =
    extraTurns * Math.PI * 2 +
    (Math.PI * 2 - (targetIndex * slice + slice / 2)) -
    (rotation % (Math.PI * 2));

  const start = rotation;
  const duration = 3800 + Math.random() * 800;
  const startedAt = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - startedAt) / duration);
    rotation = start + targetAngle * easeOutCubic(t);
    drawWheel();

    if (t < 1) {
      animId = requestAnimationFrame(frame);
      return;
    }

    spinning = false;
    canvas.classList.remove("spinning");
    spinBtn.disabled = dishes.length < 2;
    spinBtn.textContent = "开始";

    const winner = dishes[getSelectedIndex()];
    resultName.textContent = winner;
    result.classList.add("is-reveal");
  }

  animId = requestAnimationFrame(frame);
}

dishForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (spinning) return;

  const name = normalizeText(dishInput.value);
  if (!name) return;

  if (dishes.includes(name)) {
    dishInput.value = "";
    dishInput.focus();
    result.classList.remove("is-reveal");
    resultName.textContent = `「${name}」已经在转盘上了`;
    return;
  }

  dishes.push(name);
  saveDishes();
  dishInput.value = "";
  dishInput.focus();
  refresh();
});

clearBtn.addEventListener("click", () => {
  if (spinning) return;
  if (!dishes.length) return;
  if (!confirm("确定清空全部菜品吗？")) return;
  dishes = [];
  saveDishes();
  result.classList.remove("is-reveal");
  resultName.textContent = "先加几道菜吧";
  refresh();
});

spinBtn.addEventListener("click", spin);
canvas.addEventListener("click", spin);

window.addEventListener("beforeunload", () => {
  if (animId) cancelAnimationFrame(animId);
});

refresh();
