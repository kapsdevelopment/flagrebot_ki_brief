"use strict";

const paperRestPlacement = { scale: 2.88, offsetX: -415, offsetY: -7 };
const paperGrip = { x: (678 + 415) / 2.88, y: (336 + 7) / 2.88 };
const halfSheetHeight = 1448 * 1.12 / 2 / paperRestPlacement.scale;

function paperEase(progress) {
  const clamped = Math.max(0, Math.min(1, progress));
  return clamped * clamped * (3 - 2 * clamped);
}

function createPaperRobot(canvas, rearCanvas, poses) {
  const context = canvas.getContext("2d");
  const rearContext = rearCanvas.getContext("2d");
  const hip = { x: 267, y: 320 };
  const shoulder = { x: 329, y: 218 };
  const elbowRest = { x: 339, y: 272 };
  const farElbow = { x: 185, y: 272 };
  const wristRest = { x: 341, y: 321 };
  const farWrist = { x: 189, y: 325 };
  const fingerReach = 23;
  const relaxed = .46;
  const upperLength = Math.hypot(elbowRest.x - shoulder.x, elbowRest.y - shoulder.y);
  const forearmLength = Math.hypot(wristRest.x - elbowRest.x, wristRest.y - elbowRest.y);
  const upperRestAngle = Math.atan2(elbowRest.y - shoulder.y, elbowRest.x - shoulder.x);
  const forearmRestAngle = Math.atan2(wristRest.y - elbowRest.y, wristRest.x - elbowRest.x);
  // Reuse the standing drawing for the visible surfaces and complete the
  // shapes hidden by the gloves before the parts move independently.
  const torso = new Path2D("M0 0H512V237H346L337 242L325 246L320 264L318 274L321 284Q319 295 307 302Q271 316 223 300L216 302L211 289L201 273L165 271L0 274Z");
  const boots = new Path2D("M0 378H201L211 367Q229 379 247 369L256 377H275L283 368Q302 379 319 369L330 378H512V512H0Z");
  const upperShell = new Path2D("M320 217Q332 213 343 222Q349 236 352 253Q355 267 345 272Q337 277 329 271Q322 266 322 255Q317 235 320 217Z");
  // Trace the two cream shells as closed contours so their outlines survive rotation.
  const nearSleeve = new Path2D("M327 270Q338 266 349 270C356 275 362 288 365 298C369 310 367 322 359 328Q356 332 352 327Q342 316 328 317C325 312 323 301 322 291Q320 278 327 270Z");
  const farSleeve = new Path2D("M171 272Q185 269 198 273Q204 278 208 287C213 298 218 307 213 313Q210 318 204 319Q192 324 183 332Q175 338 168 333C157 326 155 316 157 303Q159 286 171 272Z");
  const nearCuff = new Path2D();
  nearCuff.ellipse(elbowRest.x, elbowRest.y, 14.8, 7.2, -.13, 0, Math.PI * 2);
  const farCuff = new Path2D();
  farCuff.ellipse(farElbow.x, farElbow.y, 15, 6.6, .12, 0, Math.PI * 2);
  const leftThigh = new Path2D("M209 319Q226 313 253 330Q252 349 247 369Q229 380 211 368Q207 354 207 336Q207 326 209 319Z");
  const rightThigh = new Path2D("M276 331Q302 312 324 319Q326 342 319 369Q302 381 283 369Q279 357 276 331Z");
  const pelvis = new Path2D("M217 284Q256 298 304 282Q316 281 322 297Q328 310 325 328Q308 332 289 344Q277 351 270 333L264 333Q260 352 248 345Q227 333 208 327Q207 300 217 284Z");
  const hipSeams = new Path2D("M254 304Q267 316 264 333M299 306Q292 327 270 333");
  const palm = new Path2D("M-9 -11Q-5 -17 5 -17Q15 -16 19 -7L21 2Q22 9 16 14Q7 18 -4 15Q-11 10 -9 -11Z");
  const ink = "#252022";

  function shading(layer, fromX, fromY, toX, toY, light, dark) {
    const gradient = layer.createLinearGradient(fromX, fromY, toX, toY);
    gradient.addColorStop(0, light);
    gradient.addColorStop(1, dark);
    return gradient;
  }

  function paintShell(layer, path, fill, outline = 2.8) {
    layer.fillStyle = fill;
    layer.fill(path);
    layer.strokeStyle = ink;
    layer.lineWidth = outline;
    layer.lineJoin = "round";
    layer.stroke(path);
  }

  function drawPart(layer, part, origin, target, angle, draw = drawClipped) {
    layer.save();
    layer.translate(target.x, target.y);
    layer.rotate(angle);
    layer.translate(-origin.x, -origin.y);
    draw(layer, part);
    layer.restore();
  }

  function drawClipped(layer, mask) {
    layer.save();
    layer.clip(mask);
    layer.drawImage(poses, 0, 0, 512, 512, 0, 0, 512, 512);
    layer.restore();
  }

  function drawLegs(layer) {
    drawClipped(layer, boots);
    paintShell(layer, leftThigh, shading(layer, 229, 345, 205, 357, "#f9eae1", "#d8beb9"));
    paintShell(layer, rightThigh, shading(layer, 306, 346, 279, 358, "#f9eae1", "#dcc3bc"));
    paintShell(layer, pelvis, shading(layer, 263, 301, 277, 345, "#3e373b", "#302a2e"));
    layer.stroke(hipSeams);
  }

  function drawForearm(layer, { shell, cuff, highlight, shadow }) {
    paintShell(layer, shell, shading(layer, ...highlight, ...shadow, "#fff0e6", "#dcc4bd"), 3.6);
    paintShell(layer, cuff, "#f6e7dd", 3.2);
  }

  function drawUpperArm(layer, shell) {
    paintShell(layer, shell, shading(layer, 344, 241, 322, 252, "#fff0e6", "#dcc4bd"), 3.6);
  }

  const nearForearm = { shell: nearSleeve, cuff: nearCuff, highlight: [354, 286], shadow: [325, 318] };
  const farForearm = { shell: farSleeve, cuff: farCuff, highlight: [188, 296], shadow: [157, 321] };

  function drawHand(layer, behind, wrist, angle, side, closed) {
    const opening = 1 - closed;
    function placeHand(target) {
      target.save();
      target.translate(wrist.x, wrist.y);
      target.rotate(angle);
      target.scale(1, side);
    }

    const fingers = new Path2D();
    const tip = 25 + 7 * opening;
    const spread = 2 + 6 * opening;
    fingers.moveTo(7, -10);
    fingers.bezierCurveTo(16, -14, tip - 6, -9 - spread, tip - 2, -6 - spread);
    fingers.quadraticCurveTo(tip + 4, -2 - spread, tip, 1);
    fingers.quadraticCurveTo(tip + 1, 7, tip - 4, 8);
    fingers.quadraticCurveTo(tip - 4, 13, tip - 11, 13);
    fingers.quadraticCurveTo(11, 13, 6, 9);
    fingers.closePath();

    const fingerLayer = behind ?? layer;
    placeHand(fingerLayer);
    paintShell(fingerLayer, fingers, shading(fingerLayer, 10, -10, 28, 11, "#514950", "#362f34"), 2.2);
    fingerLayer.lineWidth = 1.4;
    fingerLayer.lineCap = "round";
    fingerLayer.beginPath();
    fingerLayer.moveTo(tip - 7, -4);
    fingerLayer.quadraticCurveTo(tip - 3, -1, tip, 1);
    fingerLayer.moveTo(tip - 10, 4);
    fingerLayer.quadraticCurveTo(tip - 8, 7, tip - 4, 8);
    fingerLayer.stroke();
    fingerLayer.restore();

    placeHand(layer);
    paintShell(layer, palm, shading(layer, 1, -13, 15, 14, "#494247", "#332d31"), 2.4);
    const thumb = new Path2D();
    const thumbTip = 25 - 4 * opening;
    const thumbY = 1 + 10 * opening;
    thumb.moveTo(8, 3);
    thumb.quadraticCurveTo(15, thumbY - 7, thumbTip, thumbY - 5);
    thumb.quadraticCurveTo(thumbTip + 7, thumbY, thumbTip + 1, thumbY + 5);
    thumb.quadraticCurveTo(19, thumbY + 9, 11, 12);
    thumb.quadraticCurveTo(5, 9, 8, 3);
    paintShell(layer, thumb, "#5a5056", 2.1);
    layer.restore();
  }

  function blendAngle(from, to, amount) {
    const change = to - from;
    return from + Math.atan2(Math.sin(change), Math.cos(change)) * amount;
  }

  function renderGrip(layer, behind, fold, engaged, fingers) {
    // Slide along the same edge of the moving flap towards its hinge.
    const fromCrease = halfSheetHeight * (.035 + .825 * (1 - paperEase((fold - .08) / .52)));
    const gripY = paperGrip.y + halfSheetHeight - fromCrease * Math.cos(Math.PI * fold);
    const bend = .82 * paperEase((gripY - 230) / 144);
    const sin = Math.sin(bend);
    const cos = Math.cos(bend);
    const joint = {
      x: hip.x + cos * (shoulder.x - hip.x) - sin * (shoulder.y - hip.y),
      y: hip.y + sin * (shoulder.x - hip.x) + cos * (shoulder.y - hip.y),
    };
    const deltaX = paperGrip.x - joint.x;
    const deltaY = gripY - joint.y;
    const reach = Math.hypot(deltaX, deltaY);
    // Include the distance from the wrist to the pinch point in the arm solve.
    const wristFlex = .82 - 1.18 * paperEase(fold / .53);
    const gripForward = forearmLength + fingerReach * Math.cos(wristFlex);
    const gripSide = fingerReach * Math.sin(wristFlex);
    const gripBearing = Math.atan2(gripSide, gripForward);
    const lowerLength = Math.hypot(gripForward, gripSide);
    const along = (upperLength ** 2 - lowerLength ** 2 + reach ** 2) / (2 * reach);
    const outward = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
    const goalElbow = {
      x: joint.x + (along * deltaX - outward * deltaY) / reach,
      y: joint.y + (along * deltaY + outward * deltaX) / reach,
    };
    // Lead with the forearm so the hand lifts beside the sheet before the shoulder opens.
    const upperAngle = blendAngle(upperRestAngle, Math.atan2(goalElbow.y - joint.y, goalElbow.x - joint.x), engaged ** 2);
    const goalForearm = Math.atan2(gripY - goalElbow.y, paperGrip.x - goalElbow.x) - gripBearing;
    const forearmAngle = forearmRestAngle + (goalForearm - forearmRestAngle) * (1 - (1 - engaged) ** 1.5);
    const elbow = {
      x: joint.x + upperLength * Math.cos(upperAngle),
      y: joint.y + upperLength * Math.sin(upperAngle),
    };
    const wrist = {
      x: elbow.x + forearmLength * Math.cos(forearmAngle),
      y: elbow.y + forearmLength * Math.sin(forearmAngle),
    };
    const otherWrist = {
      x: hip.x + cos * (farWrist.x - hip.x) - sin * (farWrist.y - hip.y),
      y: hip.y + sin * (farWrist.x - hip.x) + cos * (farWrist.y - hip.y),
    };

    drawLegs(layer);
    drawPart(layer, upperShell, shoulder, joint, upperAngle - upperRestAngle, drawUpperArm);
    drawPart(layer, torso, hip, hip, bend);
    drawPart(layer, farForearm, hip, hip, bend, drawForearm);
    drawHand(layer, null, otherWrist, .98 + bend, -1, relaxed);
    drawPart(layer, nearForearm, elbowRest, elbow, forearmAngle - forearmRestAngle, drawForearm);
    drawHand(layer, behind, wrist, forearmAngle + engaged * wristFlex, 1, fingers);
  }

  const standingPose = document.createElement("canvas");
  standingPose.width = standingPose.height = 512;
  renderGrip(standingPose.getContext("2d"), null, 0, 0, relaxed);

  return {
    standingPose,

    draw(fold, engaged, fingers = relaxed * (1 - engaged)) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      rearContext.clearRect(0, 0, rearCanvas.width, rearCanvas.height);
      context.save();
      rearContext.save();
      const { scale, offsetX, offsetY } = paperRestPlacement;
      context.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      rearContext.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      if (engaged === 0) context.drawImage(standingPose, 0, 0);
      else renderGrip(context, rearContext, fold, engaged, fingers);
      context.restore();
      rearContext.restore();
    },

    spin(image, turn) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawPirouetteFrame(context, image, turn, 350, 1436, 3.46);
    },
  };
}
