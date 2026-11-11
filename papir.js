"use strict";

const presentation = document.getElementById("presentation");
const paperSlide = document.getElementById("paper-slide");
const scene = document.getElementById("scene");
const letter = document.getElementById("letter");
const pageTitle = document.getElementById("page-title");
const pageCopy = document.getElementById("page-copy");
const status = document.getElementById("status");
const avatar = document.getElementById("avatar");
const avatarView = avatar.parentElement;
const rearGrip = document.getElementById("rear-grip");
const closingSlide = document.getElementById("closing-slide");
const closingTitle = document.getElementById("closing-title");
const closingAvatar = document.getElementById("closing-avatar");
const closingMetrics = document.getElementById("closing-metrics");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const navigationKeys = new Map([
  ["ArrowLeft", -1], ["ArrowUp", -1], ["PageUp", -1],
  ["ArrowRight", 1], ["ArrowDown", 1], ["PageDown", 1], ["Enter", 1], [" ", 1],
]);
let page = 0;
let moving = false;
let robot;
let idle;
let spinImage;
let spinTimer;
let spinning;

function animate(duration, draw) {
  if (reducedMotion.matches) {
    draw(1);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let start;
    function tick(now) {
      start ??= now;
      const progress = Math.min(1, (now - start) / duration);
      draw(paperEase(progress));
      if (progress === 1) resolve();
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

function fitText(element, widen = false) {
  element.style.removeProperty("font-size");
  if (widen) element.classList.remove("use-paper-width");

  const panel = element.parentElement;
  const { paddingTop, paddingBottom } = getComputedStyle(panel);
  const availableHeight = Math.floor(panel.clientHeight - parseFloat(paddingTop) - parseFloat(paddingBottom));
  if (element.scrollHeight <= availableHeight) return;

  if (widen) {
    element.classList.add("use-paper-width");
    if (element.scrollHeight <= availableHeight) return;
  }

  let fitting = 0;
  let tooLarge = parseFloat(getComputedStyle(element).fontSize);
  while (tooLarge - fitting > .1) {
    const size = (fitting + tooLarge) / 2;
    element.style.fontSize = `${size}px`;
    if (element.scrollHeight <= availableHeight) fitting = size;
    else tooLarge = size;
  }
  element.style.fontSize = `${fitting}px`;
}

function fitSlideText() {
  if (paperSlide.hidden) return;
  fitText(pageTitle);
  fitText(pageCopy, true);
}

function renderPage() {
  const current = pages[page];
  const showClosing = current.layout === "closing";
  paperSlide.hidden = showClosing;
  closingSlide.hidden = !showClosing;
  if (showClosing) {
    closingAvatar.append(avatarView);
    closingTitle.textContent = current.title;
    closingMetrics.replaceChildren();
    for (const { value, label } of current.metrics) {
      const metric = document.createElement("p");
      metric.className = "closing-metric";
      const number = document.createElement("strong");
      number.textContent = value;
      const caption = document.createElement("span");
      caption.textContent = label;
      metric.append(number, caption);
      closingMetrics.append(metric);
    }
    return;
  }

  if (avatarView.parentElement !== scene) scene.append(avatarView);
  pageTitle.textContent = current.title;
  pageCopy.replaceChildren();
  const blocks = Array.isArray(current.copy) ? current.copy : [current.copy];
  for (const block of blocks) {
    if (typeof block === "string") {
      const paragraph = document.createElement("p");
      paragraph.textContent = block;
      pageCopy.append(paragraph);
    } else if (Array.isArray(block?.bullets) && block.bullets.length) {
      const list = document.createElement("ul");
      for (const item of block.bullets) {
        const bullet = document.createElement("li");
        bullet.textContent = item;
        list.append(bullet);
      }
      pageCopy.append(list);
    } else if (Array.isArray(block?.boxes) && block.boxes.length) {
      const boxes = document.createElement("div");
      boxes.className = "slide-boxes";
      for (const [index, text] of block.boxes.entries()) {
        if (index > 0 && block.separator) {
          const separator = document.createElement("span");
          separator.className = "slide-box-separator";
          separator.textContent = block.separator;
          boxes.append(separator);
        }
        const box = document.createElement("div");
        box.className = "slide-box";
        box.textContent = text;
        boxes.append(box);
      }
      pageCopy.append(boxes);
    }
  }
  fitSlideText();
}

function foldBetween(from, to) {
  return animate(1050, (progress) => {
    const fold = from + (to - from) * progress;
    robot.draw(fold, 1, 1);
    scene.style.setProperty("--fold-angle", `${-180 * fold}deg`);
  });
}

function scheduleSpin() {
  clearTimeout(spinTimer);
  if (robot && spinImage && !moving && !spinning && !document.hidden && !reducedMotion.matches) {
    spinTimer = setTimeout(spinDuringRest, 30000 + Math.random() * 15000);
  }
}

async function spinDuringRest() {
  spinning = (async () => {
    await idle?.settle();
    if (moving || document.hidden || reducedMotion.matches) return;
    avatar.setAttribute("aria-label", "Robotavataren tar en piruett");
    await animate(1150, (progress) => robot.spin(spinImage, progress));
    robot.draw(0, 0);
    avatar.setAttribute("aria-label", "Animert Flagrebot");
  })();
  try {
    await spinning;
  } finally {
    spinning = null;
    idle?.sync();
    scheduleSpin();
  }
}

async function goToSlide(direction) {
  if (!robot || moving) return;
  const nextPage = page + direction;
  if (nextPage < 0 || nextPage >= pages.length) return;
  moving = true;
  clearTimeout(spinTimer);
  try {
    status.textContent = "Bytter tekst …";
    if (spinning) await spinning;
    else await idle?.settle();
    if (pages[page].layout === "closing" || pages[nextPage].layout === "closing") {
      page = nextPage;
      renderPage();
      robot.draw(0, 0);
      status.textContent = `${page + 1} av ${pages.length} · ${pages[page].title}`;
      return;
    }

    await animate(420, (progress) => robot.draw(0, progress));
    await animate(150, (progress) => robot.draw(0, 1, progress));

    letter.setAttribute("aria-hidden", "true");
    scene.dataset.paper = "closing";
    await foldBetween(0, 1);
    scene.dataset.paper = "folded";
    page = nextPage;
    renderPage();
    if (!reducedMotion.matches) await new Promise((resolve) => setTimeout(resolve, 120));

    scene.dataset.paper = "opening";
    await foldBetween(1, 0);
    scene.dataset.paper = "open";
    letter.removeAttribute("aria-hidden");
    await animate(145, (progress) => robot.draw(0, 1, 1 - progress));
    await animate(390, (progress) => robot.draw(0, 1 - progress));
    status.textContent = `${page + 1} av ${pages.length} · ${pages[page].title}`;
  } finally {
    moving = false;
    idle?.sync();
    scheduleSpin();
  }
}

renderPage();
new ResizeObserver(fitSlideText).observe(letter);
presentation.addEventListener("click", (event) => {
  if (window.getSelection()?.toString()) return;
  const { left, width } = presentation.getBoundingClientRect();
  goToSlide(event.clientX < left + width / 2 ? -1 : 1);
});
document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  const direction = navigationKeys.get(event.key);
  if (direction === undefined) return;
  event.preventDefault();
  if (!event.repeat) goToSlide(direction);
});

function loadIllustration(url) {
  const image = new Image();
  image.src = url;
  return image.decode().then(() => image);
}

loadIllustration("poses.png").then((poses) => {
  robot = createPaperRobot(avatar, rearGrip, poses);
  robot.draw(0, 0);
  idle = createIdleAnimation(poses, () => moving || spinning || document.hidden || reducedMotion.matches ? null : "standing", {
    ...paperRestPlacement,
    standingPose: robot.standingPose,
  });
  idle?.sync();
  scheduleSpin();
}).catch((error) => {
  console.error(error);
  status.classList.remove("visually-hidden");
  status.textContent = "Robotavataren kunne ikke lastes. Last siden på nytt.";
});

loadIllustration("pirouette.png").then((image) => {
  spinImage = image;
  scheduleSpin();
}).catch(console.error);

function refreshIdle() {
  idle?.sync();
  scheduleSpin();
}

document.addEventListener("visibilitychange", refreshIdle);
reducedMotion.addEventListener("change", refreshIdle);
