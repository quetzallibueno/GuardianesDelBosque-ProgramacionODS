(() => {
  "use strict";

  const canvas = document.getElementById("forest-canvas");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);

  let W = 900, H = 470, dpr = 1;
  let trees = [], flowers = [], animals = [], litter = [], visitors = [], particles = [];
  let seeds = 12, water = 8, score = 0, health = 70;
  let treesPlanted = 0, incidentsResolved = 0, elapsed = 0;
  let selectedTool = "plant", activeIncident = null, gameWon = false;
  let toastTimer = null, visitorTimer = null, naturalTimer = null, nextVisitorId = 1;
  const animalKinds = ["🦊", "🐇", "🦔", "🦉", "🦋", "🐿️", "🦌"];
  const tips = [
    "La biodiversidad hace que los ecosistemas sean más resistentes y saludables.",
    "Los árboles capturan carbono, protegen el suelo y ofrecen refugio a muchas especies.",
    "Un residuo que recoges hoy puede evitar que contamine el agua y el suelo mañana.",
    "Cuidar la naturaleza también significa respetar los espacios donde viven los animales.",
    "Los pequeños actos de conservación, repetidos por muchas personas, pueden generar grandes cambios."
  ];

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function groundY() { return H * 0.69; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function roundedRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x + w, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(320, rect.width);
    H = Math.max(300, rect.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    trees.forEach(t => { t.x = clamp(t.x, 20, W - 20); t.y = clamp(t.y, groundY() + 8, H - 20); });
    flowers.forEach(f => { f.x = clamp(f.x, 8, W - 8); f.y = clamp(f.y, groundY() + 10, H - 8); });
  }

  function addTree(x, y, initial = false) {
    trees.push({ x, y, size: rand(0.72, 1.18), tone: Math.floor(rand(0, 4)), age: initial ? 1 : 0, sway: rand(0, Math.PI * 2) });
    if (!initial) {
      treesPlanted++; score += 10; health = clamp(health + 1.5, 0, 100);
      if (treesPlanted % 3 === 0) seeds++;
      showToast("¡Un nuevo árbol echa raíces! +10 puntos");
      burst(x, y - 22, "#91bf72", 9);
    }
    updateUI();
  }

  function addFlower(x, y) {
    flowers.push({ x, y, size: rand(0.65, 1.15), color: pick(["#f7c85e", "#f2a6b6", "#f7f2dc", "#b9a4df", "#e89c67"]), phase: rand(0, 7) });
    score += 3; health = clamp(health + 0.5, 0, 100);
    showToast("¡Las flores atraen vida al bosque! +3 puntos");
    burst(x, y - 5, "#f5d681", 5); updateUI();
  }

  function createAnimal(x, y, kind) {
    return { x, y, kind: kind || pick(animalKinds), phase: rand(0, 8), speed: rand(0.15, 0.5), direction: Math.random() < .5 ? -1 : 1, scale: rand(.78, 1.1) };
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) particles.push({ x, y, vx: rand(-1.5, 1.5), vy: rand(-2.4, -.2), life: rand(22, 42), color, size: rand(2, 4) });
  }

  function showToast(message) {
    const toast = $("world-toast");
    toast.textContent = message;
    toast.classList.remove("fade");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("fade"), 2800);
    $("live-region").textContent = message;
  }

  function updateUI() {
    $("health-value").textContent = Math.round(health);
    $("health-bar").style.width = health + "%";
    $("health-label").textContent = health >= 90 ? "Ecosistema saludable" : health >= 65 ? "En recuperación" : health >= 40 ? "Necesita atención" : "En peligro";
    $("seed-value").textContent = seeds;
    $("water-value").textContent = water;
    $("score-value").textContent = score;
    $("tree-count").textContent = trees.length;
    $("flower-count").textContent = flowers.length;
    $("animal-count").textContent = animals.length;
    $("litter-count").textContent = litter.length;
    $("trees-progress").textContent = Math.min(treesPlanted, 10) + "/10";
    $("trees-bar").style.width = Math.min(treesPlanted / 10 * 100, 100) + "%";
    $("incidents-progress").textContent = Math.min(incidentsResolved, 4) + "/4";
    $("incidents-bar").style.width = Math.min(incidentsResolved / 4 * 100, 100) + "%";
    $("health-progress").textContent = Math.round(health) + "/90%";
    $("health-mission-bar").style.width = Math.min(health / 90 * 100, 100) + "%";
    $("time-progress").textContent = formatTime(elapsed) + "/2:00";
    $("time-bar").style.width = Math.min(elapsed / 120 * 100, 100) + "%";
    $("day-count").textContent = Math.floor(elapsed / 60) + 1;
    if (treesPlanted >= 10) document.querySelector('[data-mission="trees"]').classList.add("complete");
    if (incidentsResolved >= 4) document.querySelector('[data-mission="incidents"]').classList.add("complete");
    if (health >= 90) document.querySelector('[data-mission="health"]').classList.add("complete");
    if (elapsed >= 120) document.querySelector('[data-mission="time"]').classList.add("complete");
    checkWin();
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return mins + ":" + secs;
  }

  function checkWin() {
    if (!gameWon && treesPlanted >= 10 && incidentsResolved >= 4 && health >= 90 && elapsed >= 120) {
      gameWon = true;
      clearTimeout(visitorTimer); clearTimeout(naturalTimer);
      $("final-score").textContent = score;
      $("end-modal").classList.remove("hidden");
      showToast("¡Lo lograste! El bosque está en mejores manos.");
    }
  }

  function drawSky(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#b9e2e1"); gradient.addColorStop(.62, "#e1efd8"); gradient.addColorStop(1, "#b8d5a4");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff8c8"; ctx.beginPath(); ctx.arc(W * .82, H * .17, Math.min(W, H) * .065, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff70"; ctx.beginPath(); ctx.ellipse(W * .2, H * .2, 43, 13, -.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * .24, H * .18, 25, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W * .16, H * .18, 20, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#9ec8ae";
    ctx.beginPath(); ctx.moveTo(0, H * .57); ctx.lineTo(W * .16, H * .3); ctx.lineTo(W * .33, H * .58); ctx.lineTo(W * .52, H * .34); ctx.lineTo(W * .75, H * .6); ctx.lineTo(W * .91, H * .38); ctx.lineTo(W, H * .52); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#80b18b";
    ctx.beginPath(); ctx.moveTo(0, H * .66); ctx.lineTo(W * .2, H * .45); ctx.lineTo(W * .4, H * .68); ctx.lineTo(W * .65, H * .43); ctx.lineTo(W * .85, H * .67); ctx.lineTo(W, H * .53); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    // Nubes lentas para dar movimiento al paisaje.
    const cloudX = ((time * .008) % (W + 150)) - 70;
    ctx.fillStyle = "#ffffff55";
    ctx.beginPath(); ctx.ellipse(cloudX, H * .31, 32, 11, 0, 0, Math.PI * 2); ctx.ellipse(cloudX + 22, H * .3, 22, 14, 0, 0, Math.PI * 2); ctx.ellipse(cloudX - 20, H * .3, 18, 9, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawGround() {
    const gy = groundY();
    ctx.fillStyle = "#83b66d"; ctx.beginPath(); ctx.moveTo(0, gy); ctx.quadraticCurveTo(W * .25, gy - 18, W * .5, gy + 4); ctx.quadraticCurveTo(W * .77, gy + 20, W, gy - 4); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#65985a"; ctx.beginPath(); ctx.moveTo(0, gy + 28); ctx.quadraticCurveTo(W * .4, gy - 2, W * .7, gy + 35); ctx.quadraticCurveTo(W * .87, gy + 45, W, gy + 22); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    // Arroyo decorativo.
    ctx.fillStyle = "#75c9d0"; ctx.beginPath(); ctx.moveTo(W * .62, gy + 8); ctx.bezierCurveTo(W * .58, gy + 45, W * .74, gy + 58, W * .68, H); ctx.lineTo(W * .85, H); ctx.bezierCurveTo(W * .83, gy + 55, W * .72, gy + 43, W * .77, gy + 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#d0f2e7"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W * .69, gy + 22); ctx.quadraticCurveTo(W * .73, gy + 42, W * .72, gy + 60); ctx.stroke();
    // Hierba.
    for (let i = 0; i < W / 12; i++) {
      const x = (i * 37) % W, y = gy + 20 + ((i * 19) % Math.max(20, H - gy - 20));
      ctx.strokeStyle = i % 2 ? "#427b4d" : "#a4cc78"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y + 5); ctx.lineTo(x - 2, y - 2); ctx.moveTo(x, y + 5); ctx.lineTo(x + 3, y); ctx.stroke();
    }
  }

  function drawTree(tree, time) {
    const scale = tree.size * (tree.age === 0 ? .72 : 1);
    const trunkH = 27 * scale, crown = 27 * scale, sway = Math.sin(time * .001 + tree.sway) * 2;
    ctx.save(); ctx.translate(tree.x, tree.y); ctx.rotate(sway * .012);
    ctx.fillStyle = "#79543b"; roundedRect(-4 * scale, -trunkH, 8 * scale, trunkH + 2, 3 * scale); ctx.fill();
    const shades = ["#2f7148", "#3d8150", "#4d9257", "#286640"];
    ctx.fillStyle = shades[tree.tone];
    ctx.beginPath(); ctx.arc(0, -trunkH - crown * .65, crown, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-crown * .55, -trunkH - crown * .28, crown * .72, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(crown * .55, -trunkH - crown * .25, crown * .75, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff1c"; ctx.beginPath(); ctx.arc(-crown * .35, -trunkH - crown * .72, crown * .3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawFlower(f, time) {
    const bob = Math.sin(time * .003 + f.phase) * 1.5;
    ctx.save(); ctx.translate(f.x, f.y + bob);
    ctx.strokeStyle = "#397947"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -10 * f.size); ctx.stroke();
    ctx.fillStyle = f.color;
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 3.5 * f.size, -10 * f.size + Math.sin(a) * 3.5 * f.size, 3 * f.size, 2.5 * f.size, a, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#e6b94f"; ctx.beginPath(); ctx.arc(0, -10 * f.size, 2.2 * f.size, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawAnimal(a, time) {
    const bob = Math.sin(time * .004 + a.phase) * 2;
    ctx.save(); ctx.translate(a.x, a.y + bob); ctx.scale(a.direction * a.scale, a.scale);
    ctx.font = "25px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(a.kind, 0, 0);
    ctx.restore();
  }

  function drawLitter(item, time) {
    ctx.save(); ctx.translate(item.x, item.y);
    if (item.type === "cigarette") {
      ctx.rotate(-.2); ctx.fillStyle = "#f2eee0"; roundedRect(-8, -2, 16, 4, 1); ctx.fill(); ctx.fillStyle = "#d75c45"; ctx.fillRect(4, -2, 4, 4);
    } else {
      ctx.fillStyle = "#e8e3cf"; roundedRect(-6, -7, 12, 14, 2); ctx.fill(); ctx.fillStyle = "#77a9a1"; ctx.fillRect(-5, -5, 10, 4); ctx.fillStyle = "#ffffff90"; ctx.fillRect(-3, -4, 2, 2);
    }
    ctx.restore();
  }

  function drawVisitor(v, time) {
    if (v.resolved) return;
    const bob = Math.sin(time * .006 + v.id) * 2;
    ctx.save(); ctx.translate(v.x, v.y + bob);
    // Sombra y silueta para que se distingan claramente en el paisaje.
    ctx.fillStyle = "#24412c35"; ctx.beginPath(); ctx.ellipse(0, 3, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f0c6a0"; ctx.beginPath(); ctx.arc(0, -25, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = v.kind === "logging" ? "#b84e39" : v.kind === "cigarette" ? "#5b6fa5" : "#d68b42";
    roundedRect(-8, -17, 16, 23, 5); ctx.fill();
    ctx.strokeStyle = "#594b3c"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(-7, 16); ctx.moveTo(4, 5); ctx.lineTo(7, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-15, -2); ctx.moveTo(6, -10); ctx.lineTo(14, -5); ctx.stroke();
    ctx.fillStyle = "#fff9ed"; roundedRect(-21, -52, 42, 19, 6); ctx.fill();
    ctx.fillStyle = "#b13e2b"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(v.kind === "logging" ? "🪓" : v.kind === "cigarette" ? "🚬" : "🗑️", 0, -42);
    ctx.fillStyle = "#9c3024"; roundedRect(-48, -78, 96, 17, 5); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 8px sans-serif"; ctx.fillText("¡DETÉN ESTA ACCIÓN!", 0, -69.5);
    ctx.strokeStyle = "#f8e7d5"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -25, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha = clamp(p.life / 35, 0, 1); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      p.x += p.vx; p.y += p.vy; p.vy += .04; p.life--;
    });
    ctx.globalAlpha = 1;
    particles = particles.filter(p => p.life > 0);
  }

  function render(time = 0) {
    ctx.clearRect(0, 0, W, H);
    drawSky(time); drawGround();
    trees.sort((a, b) => a.y - b.y).forEach(t => drawTree(t, time));
    flowers.forEach(f => drawFlower(f, time));
    litter.forEach(item => drawLitter(item, time));
    animals.forEach(a => drawAnimal(a, time));
    visitors.forEach(v => drawVisitor(v, time));
    drawParticles();
    requestAnimationFrame(render);
  }

  function spawnVisitor() {
    if (gameWon) return;
    if (activeIncident) { scheduleVisitor(12000); return; }
    const kind = pick(["litter", "cigarette", "logging"]);
    const visitor = { id: nextVisitorId++, x: rand(W * .18, W * .82), y: rand(groundY() + 38, H - 25), kind, resolved: false, expires: Date.now() + 14000 };
    visitors.push(visitor); activeIncident = visitor;
    const messages = { litter: "Una persona está tirando basura.", cigarette: "Alguien está arrojando una colilla.", logging: "Una persona intenta cortar un árbol." };
    $("incident-text").textContent = messages[kind];
    $("incident-banner").classList.remove("hidden");
    selectTool("intervene");
    $("world-hint").textContent = "Selecciona «Intervenir» y haz clic directamente sobre la persona.";
    showToast("¡Atención! Alguien está poniendo en riesgo el ecosistema.");
    visitorTimer = setTimeout(() => {
      if (activeIncident && activeIncident.id === visitor.id) failIncident(visitor);
    }, 14000);
  }

  function scheduleVisitor(delay = rand(24000, 36000)) {
    clearTimeout(visitorTimer);
    visitorTimer = setTimeout(spawnVisitor, delay);
  }

  function scheduleNaturalEvent() {
    clearTimeout(naturalTimer);
    naturalTimer = setTimeout(() => {
      if (!gameWon) {
        naturalEvent();
        scheduleNaturalEvent();
      }
    }, rand(38000, 56000));
  }

  function naturalEvent() {
    const event = pick(["rain", "drought", "pollution"]);
    if (event === "rain") {
      water += 3; health = clamp(health + 4, 0, 100);
      showToast("🌧️ Llegó la lluvia: recuperas agua y salud.");
      burst(W * .5, groundY(), "#b5e6ef", 16);
    } else if (event === "drought") {
      water = Math.max(0, water - 2); health = clamp(health - 5, 0, 100);
      showToast("☀️ Sequía: el bosque necesita agua. ¡Riega el terreno!");
    } else {
      health = clamp(health - 4, 0, 100);
      litter.push({ x: rand(25, W - 25), y: rand(groundY() + 25, H - 12), type: "trash" });
      showToast("🌫️ La contaminación afecta el bosque. Usa Limpiar.");
    }
    $("eco-tip").textContent = pick(tips);
    updateUI();
  }

  function resolveIncident(visitor) {
    if (!visitor || visitor.resolved) return;
    visitor.resolved = true; activeIncident = null; incidentsResolved++; score += 15;
    clearTimeout(visitorTimer); $("incident-banner").classList.add("hidden");
    if (visitor.kind === "litter") {
      litter.push({ x: visitor.x + 12, y: visitor.y + 13, type: "trash" });
      showToast("¡Detuviste a la persona! Recoge también la basura que dejó.");
    } else if (visitor.kind === "cigarette") {
      litter.push({ x: visitor.x + 8, y: visitor.y + 13, type: "cigarette" });
      showToast("¡Evitaste un riesgo de incendio! Recoge la colilla.");
    } else {
      showToast("¡Protegiste los árboles! La tala fue detenida. +15 puntos");
      burst(visitor.x, visitor.y - 20, "#e7bc63", 12);
    }
    $("world-hint").textContent = "Continúa cuidando el ecosistema y completa las misiones.";
    updateUI(); scheduleVisitor();
  }

  function failIncident(visitor) {
    if (!visitor || visitor.resolved) return;
    visitor.resolved = true; activeIncident = null; $("incident-banner").classList.add("hidden");
    health = clamp(health - 9, 0, 100);
    if (visitor.kind === "logging" && trees.length) {
      const nearest = trees.reduce((best, t) => Math.abs(t.x - visitor.x) < Math.abs(best.x - visitor.x) ? t : best, trees[0]);
      trees.splice(trees.indexOf(nearest), 1);
      showToast("No llegaste a tiempo: se perdió un árbol. ¡Protege el bosque!");
    } else {
      litter.push({ x: visitor.x + 12, y: visitor.y + 13, type: visitor.kind === "cigarette" ? "cigarette" : "trash" });
      showToast("El incidente no se resolvió. La salud del bosque disminuyó.");
    }
    updateUI(); scheduleVisitor(rand(22000, 32000));
  }

  function selectTool(tool) {
    selectedTool = tool;
    document.querySelectorAll(".tool-button").forEach(button => button.classList.toggle("active", button.dataset.tool === tool));
    const hints = {
      plant: "Plantar: haz clic en el suelo para sembrar un árbol (2 semillas).",
      water: "Regar: usa agua para mejorar la salud del bosque.",
      flower: "Flores: haz clic en el suelo para aumentar la biodiversidad.",
      clean: "Limpiar: haz clic cerca de los residuos para recogerlos.",
      intervene: "Intervenir: haz clic directamente sobre la persona que está dañando el bosque.",
      restore: "Restaurar: haz clic en el terreno para gastar 3 puntos y mejorar la salud."
    };
    $("world-hint").textContent = hints[tool];
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height };
  }

  function handleCanvasClick(event) {
    if (gameWon) return;
    const point = canvasPoint(event);
    if (selectedTool === "intervene") {
      if (activeIncident && Math.hypot(point.x - activeIncident.x, point.y - activeIncident.y) < 70) {
        resolveIncident(activeIncident);
      } else {
        showToast(activeIncident ? "Haz clic directamente sobre la persona para detenerla." : "No hay nadie que detener en este momento.");
      }
      return;
    }

    if (selectedTool === "plant") {
      if (seeds < 2) return showToast("No tienes suficientes semillas. Planta flores o espera a recuperarlas.");
      if (point.y < groundY() + 4) return showToast("Elige un lugar sobre el suelo para plantar.");
      seeds -= 2; addTree(point.x, point.y, false);
    } else if (selectedTool === "water") {
      if (water < 1) return showToast("No tienes agua suficiente. Espera a que llueva.");
      water--; health = clamp(health + 5, 0, 100); score += 2;
      burst(point.x, point.y, "#8bd8ef", 10); showToast("¡Buen riego! La salud del bosque mejora.");
      updateUI();
    } else if (selectedTool === "flower") {
      if (seeds < 1) return showToast("No tienes semillas suficientes.");
      if (point.y < groundY() + 4) return showToast("Siembra las flores sobre el suelo.");
      seeds--; addFlower(point.x, point.y);
      if (Math.random() < .28) animals.push(createAnimal(point.x + rand(-18, 18), point.y - 13));
      updateUI();
    } else if (selectedTool === "clean") {
      const index = litter.findIndex(item => Math.hypot(item.x - point.x, item.y - point.y) < 38);
      if (index < 0) return showToast("Haz clic cerca de una bolsa, botella o colilla para retirarla.");
      litter.splice(index, 1); score += 5; health = clamp(health + 2, 0, 100);
      showToast("¡Residuo recogido! El entorno está más limpio. +5 puntos"); burst(point.x, point.y, "#dce7bd", 7); updateUI();
    } else if (selectedTool === "restore") {
      if (score < 3) return showToast("Necesitas al menos 3 puntos para restaurar el terreno.");
      score -= 3; health = clamp(health + 8, 0, 100); flowers.push({ x: point.x, y: Math.max(point.y, groundY() + 10), size: .9, color: "#f6e4a5", phase: rand(0, 7) });
      showToast("¡Zona restaurada! La salud del ecosistema mejora."); burst(point.x, point.y, "#a7d58c", 12); updateUI();
    }
  }

  function initWorld() {
    trees = []; flowers = []; animals = []; litter = []; visitors = []; particles = [];
    seeds = 12; water = 8; score = 0; health = 70; treesPlanted = 0; incidentsResolved = 0; elapsed = 0;
    selectedTool = "plant"; activeIncident = null; gameWon = false; nextVisitorId = 1;
    $("end-modal").classList.add("hidden"); $("incident-banner").classList.add("hidden");
    clearTimeout(visitorTimer); clearTimeout(naturalTimer); clearTimeout(toastTimer);
    resizeCanvas();
    for (let i = 0; i < 10; i++) addTree(rand(25, W - 25), rand(groundY() + 12, H - 30), true);
    for (let i = 0; i < 18; i++) flowers.push({ x: rand(10, W - 10), y: rand(groundY() + 18, H - 10), size: rand(.55, .9), color: pick(["#f7c85e", "#f2a6b6", "#f7f2dc", "#b9a4df"]), phase: rand(0, 7) });
    for (let i = 0; i < 4; i++) animals.push(createAnimal(rand(25, W - 25), rand(groundY() + 28, H - 25)));
    $("eco-tip").textContent = tips[0];
    document.querySelectorAll('[data-mission]').forEach(el => el.classList.remove("complete"));
    selectTool("plant"); updateUI();
    showToast("¡Bienvenido, guardián! Elige una herramienta para comenzar.");
    scheduleVisitor(rand(18000, 28000));
    scheduleNaturalEvent();
  }

  document.querySelectorAll(".tool-button").forEach(button => {
    button.addEventListener("click", () => selectTool(button.dataset.tool));
  });
  canvas.addEventListener("click", handleCanvasClick);
  $("restart-button").addEventListener("click", initWorld);
  window.addEventListener("resize", resizeCanvas);

  setInterval(() => {
    if (gameWon) return;
    elapsed++;
    if (elapsed % 20 === 0) {
      // Los animales se desplazan despacio por la reserva.
      animals.forEach(a => { a.x += a.direction * rand(8, 22); if (a.x < 15 || a.x > W - 15) a.direction *= -1; });
    }
    updateUI();
  }, 1000);

  requestAnimationFrame(render);
  initWorld();
})();
