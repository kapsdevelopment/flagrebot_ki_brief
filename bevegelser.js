"use strict";

// All times are milliseconds from the start of the gesture. The comparison
// samples the same poses as the brief, including when the user scrubs backwards.
const foldDuration = 2650;
const originalFoldDuration = 3325;
const turnDuration = 1450;

function phase(time, start, end) {
  return paperEase((time - start) / (end - start));
}

function drawPaperFold(scene, robot, time, original = false) {
  const reach = original ? phase(time, 0, 420) - phase(time, 2935, 3325)
                         : phase(time, 0, 450) - phase(time, 2230, foldDuration);
  const pinch = original ? phase(time, 420, 570) - phase(time, 2790, 2935)
                         : phase(time, 390, 540) - phase(time, 2200, 2360);
  const fold = original ? phase(time, 570, 1620) - phase(time, 1740, 2790)
                        : phase(time, 540, 1370) - phase(time, 1480, 2200);
  const fingers = .46 * (1 - reach) + pinch;
  robot.draw(fold, reach, fingers, original);
  scene.style.setProperty("--fold-angle", `${-180 * fold}deg`);
  scene.style.setProperty("--fold-light", original ? 1 : 1 - .16 * Math.sin(Math.PI * fold));
  return time >= (original ? 1620 : 1370);
}

function drawTurn(robot, image, time, original = false) {
  if (original) {
    if (time >= 1150) robot.draw(0, 0);
    else robot.spin(image, phase(time, 0, 1150));
    return;
  }
  const onOneFoot = phase(time, 150, 255) - phase(time, 1175, 1290);
  const lean = -.055 * phase(time, 0, 190) + .065 * phase(time, 190, 510)
             - .032 * phase(time, 980, 1210) + .022 * phase(time, 1210, turnDuration);
  robot.turnOnFoot(image, phase(time, 225, 1180), lean, onOneFoot);
}
