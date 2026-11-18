"use strict";

const comparison = document.querySelector(".comparison");
const figures = [...comparison.querySelectorAll("figure")];
const choices = [...document.querySelectorAll(".choices button")];
const play = document.getElementById("play");
const timeline = document.getElementById("timeline");
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
const actions = {
  fold: {
    duration: originalFoldDuration,
    notes: ["Armen løfter seg, stopper og lukker grepet før arket brettes.", "Fingrene lukker seg på vei inn. Den frie armen balanserer kroppen, og bretten fanger skygge når arket vipper."],
  },
  look: {
    duration: 3100,
    notes: ["Et blunk, så et blikk til siden og tilbake til hvilestillingen.", "Øynene søker publikum før hodet følger etter. Hun blunker på vei tilbake og holder blikket et øyeblikk."],
  },
  spin: {
    duration: turnDuration,
    notes: ["Hun går rett fra to føtter til én og starter runden.", "Hun legger vekten på standfoten før vendingen og finner balansen igjen når begge føtter er nede."],
  },
};
let action = "fold";
let players;
let spinSheet;
let time = 0;
let frame = 0;

function draw(timeMs) {
  time = Math.min(actions[action].duration, timeMs);
  timeline.value = time;
  timeline.setAttribute("aria-valuetext", (time / 1000).toLocaleString("nb-NO", { maximumFractionDigits: 1 }) + " sekunder");
  for (const { scene, robot, idle, original, title } of players) {
    if (action === "fold") {
      const swapped = drawPaperFold(scene, robot, time, original);
      const text = swapped ? "Programvareutvikling" : "Kunstig intelligens";
      if (title.textContent !== text) title.textContent = text;
    } else if (action === "spin") {
      drawTurn(robot, spinSheet, time, original);
    } else if (time <= 210) {
      idle.paint("standing", false, 0, 0, time, 1, original);
    } else if (time >= 650 && time < 650 + (original ? 2450 : 2050)) {
      idle.paint("standing", true, .86, -.78, time - 650, 1, original);
    } else {
      idle.clear();
    }
  }
}

function pause() {
  cancelAnimationFrame(frame);
  frame = 0;
  play.textContent = time >= actions[action].duration ? "Spill igjen" : time ? "Fortsett" : "Spill av";
}

function start() {
  if (time >= actions[action].duration) draw(0);
  const origin = performance.now() - time;
  play.textContent = "Pause";
  function tick(now) {
    draw(now - origin);
    if (time < actions[action].duration) frame = requestAnimationFrame(tick);
    else pause();
  }
  frame = requestAnimationFrame(tick);
}

function select(next) {
  action = next;
  comparison.dataset.action = action;
  choices.forEach(button => button.setAttribute("aria-pressed", String(button.value === action)));
  figures.forEach((figure, i) => { figure.querySelector("figcaption").textContent = actions[action].notes[i]; });
  timeline.max = actions[action].duration;
  if (!players) return;
  for (const { robot, idle } of players) {
    idle.clear();
    robot.draw(0, 0);
  }
  draw(0);
  pause();
  if (!motionPreference.matches) start();
}

choices.forEach(button => button.addEventListener("click", () => select(button.value)));
play.addEventListener("click", () => frame ? pause() : start());
timeline.addEventListener("input", () => { draw(Number(timeline.value)); pause(); });
motionPreference.addEventListener("change", pause);
document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

async function setup() {
  select(action);
  const images = await Promise.all(["poses.png", "pirouette.png"].map(async src => {
    const image = new Image();
    image.src = src;
    await image.decode();
    return image;
  }));
  const [poses, spin] = images;
  spinSheet = spin;
  players = figures.map((figure, index) => {
    const scene = document.getElementById("study-scene").content.firstElementChild.cloneNode(true);
    figure.querySelector(".stage").append(scene);
    const [rear, avatar, canvas] = scene.querySelectorAll("canvas");
    const robot = createPaperRobot(avatar, rear, poses);
    const idle = createIdleAnimation(poses, () => null, { ...paperRestPlacement, standingPose: robot.standingPose, canvas });
    return { scene, robot, idle, original: index === 0, title: scene.querySelector(".paper-front b") };
  });
  document.getElementById("comparison-status").textContent = "";
  play.disabled = timeline.disabled = false;
  select(action);
}

setup().catch(error => {
  console.error(error);
  document.getElementById("comparison-status").textContent = "Kunne ikke laste animasjonene. Prøv å laste siden på nytt.";
});
