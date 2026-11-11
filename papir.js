"use strict";

const presentation = document.getElementById("presentation");
const scene = document.getElementById("scene");
const letter = document.getElementById("letter");
const pageIndex = document.getElementById("page-index");
const pageTitle = document.getElementById("page-title");
const pageCopy = document.getElementById("page-copy");
const status = document.getElementById("status");
const avatar = document.getElementById("avatar");
const rearGrip = document.getElementById("rear-grip");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
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

function renderPage() {
  const current = pages[page];
  pageIndex.textContent = `Side ${page + 1} av ${pages.length}`;
  pageTitle.textContent = current.title;
  pageCopy.textContent = current.copy;
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
    avatar.setAttribute("aria-label", "Robotavataren ved siden av arket");
  })();
  try {
    await spinning;
  } finally {
    spinning = null;
    idle?.sync();
    scheduleSpin();
  }
}

async function advance() {
  if (!robot || moving) return;
  moving = true;
  clearTimeout(spinTimer);
  try {
    status.textContent = "Bytter tekst …";
    if (spinning) await spinning;
    else await idle?.settle();
    await animate(420, (progress) => robot.draw(0, progress));
    await animate(150, (progress) => robot.draw(0, 1, progress));

    letter.setAttribute("aria-hidden", "true");
    scene.dataset.paper = "closing";
    await foldBetween(0, 1);
    scene.dataset.paper = "folded";
    page = (page + 1) % pages.length;
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
presentation.addEventListener("click", () => {
  if (!window.getSelection()?.toString()) advance();
});
document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (!["Enter", " ", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  if (!event.repeat) advance();
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
