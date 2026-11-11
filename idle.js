"use strict";

function createIdleAnimation(poses, getPose, { scale = 756 / 512, offsetX = 140, offsetY = 126, standingPose = poses } = {}) {
  const canvas = document.getElementById("idle-eyes");
  const context = canvas.getContext("2d");
  if (!context) return null;
  const avatarView = canvas.parentElement;
  const portrait = document.createElement("canvas");
  portrait.width = portrait.height = 512;
  const portraitContext = portrait.getContext("2d");
  const headRenderer = createRigidHeadRenderer();

  // Eye centers, iris radii and eyelash outlines in the two resting sprites.
  const faces = {
    standing: {
      image: standingPose,
      source: [0, 0],
      head: {
        pivot: [266, 191],
        profile: [257, 94, 116, 98],
        mask: "M0 0H512V171H314L306 176L298 180L290 183L282 187Q258 191 234 188L226 186L218 184L210 182L202 178H0Z",
      },
      eyes: [
        [231, 126, 19, 19, "M198 110 Q206 116 214 108 C228 96 247 101 253 116 C261 133 249 149 233 150 C215 151 204 137 206 122 Q200 119 198 110Z"],
        [307, 110, 17, 19, "M326 82 Q330 87 326 95 C335 110 328 132 309 134 C293 137 283 126 283 111 C283 96 294 87 306 86 Q319 90 326 82Z"],
      ],
    },
    sitting: {
      image: poses,
      source: [1024, 512],
      head: {
        pivot: [244, 284],
        profile: [236, 187, 115, 99],
        mask: "M0 0H512V264H285L274 270L266 274L258 277Q237 281 218 277L209 278L202 275L194 273L186 270L179 268H0Z",
      },
      eyes: [
        [211, 216, 19, 19, "M178 201 Q186 207 194 197 C211 185 228 193 233 207 C241 223 228 240 212 239 C195 239 185 227 186 212 Q179 210 178 201Z"],
        [287, 199, 17, 19, "M305 170 Q309 176 305 185 C316 202 307 219 290 223 C275 225 263 214 263 201 C263 188 273 176 285 175 Q299 179 305 170Z"],
      ],
    },
  };

  for (const face of Object.values(faces)) {
    if (headRenderer) {
      face.mask = new Path2D(face.head.mask);
      face.mesh = headRenderer.createMesh(face.head);
      face.body = document.createElement("canvas");
      face.body.width = face.body.height = 512;
      const bodyContext = face.body.getContext("2d");
      bodyContext.drawImage(face.image, ...face.source, 512, 512, 0, 0, 512, 512);
      bodyContext.globalCompositeOperation = "destination-out";
      bodyContext.fill(face.mask);
      bodyContext.globalCompositeOperation = "destination-over";
      bodyContext.fillStyle = "#2d2427";
      bodyContext.beginPath();
      bodyContext.ellipse(...face.head.pivot, 22, 7, 0, 0, Math.PI * 2);
      bodyContext.fill();
    }
    face.eyes = face.eyes.map(([x, y, rx, ry, outline]) => {
      const layer = document.createElement("canvas");
      const width = layer.width = rx * 2 + 1;
      const height = layer.height = ry * 2 + 1;
      const buffer = layer.getContext("2d", { willReadFrequently: true });
      const left = x - rx;
      const top = y - ry;
      buffer.drawImage(face.image, face.source[0] + left, face.source[1] + top, width, height, 0, 0, width, height);
      const source = buffer.getImageData(0, 0, width, height).data;
      const frame = buffer.createImageData(width, height);
      return { x, y, rx, ry, left, top, layer, buffer, source, frame, outline: new Path2D(outline) };
    });
  }

  function ease(value) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  }

  function drawGlance(eye, horizontal, vertical) {
    const { rx, ry, left, top, layer, buffer, source, frame } = eye;
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const weight = 1 - ((x - rx) / rx) ** 2 - ((y - ry) / ry) ** 2;
        if (weight <= 0) continue;
        const sampleX = x - horizontal * 8 * weight;
        const sampleY = y - vertical * 6 * weight;
        const column = Math.floor(sampleX);
        const row = Math.floor(sampleY);
        const mixX = sampleX - column;
        const mixY = sampleY - row;
        const above = (row * layer.width + column) * 4;
        const below = above + layer.width * 4;
        const to = (y * layer.width + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          const topColor = source[above + channel] * (1 - mixX) + source[above + channel + 4] * mixX;
          const bottomColor = source[below + channel] * (1 - mixX) + source[below + channel + 4] * mixX;
          frame.data[to + channel] = topColor * (1 - mixY) + bottomColor * mixY;
        }
        frame.data[to + 3] = 255;
      }
    }
    buffer.putImageData(frame, 0, 0);
    portraitContext.drawImage(layer, left, top);
  }

  function drawHeadLook(face, horizontal, vertical, gazeX, gazeY) {
    portraitContext.clearRect(0, 0, 512, 512);
    portraitContext.drawImage(face.image, ...face.source, 512, 512, 0, 0, 512, 512);
    if (gazeX !== 0 || gazeY !== 0) {
      for (const eye of face.eyes) drawGlance(eye, gazeX, gazeY);
    }

    if (!headRenderer || (horizontal === 0 && vertical === 0)) {
      context.drawImage(portrait, 0, 0);
      return;
    }

    portraitContext.save();
    portraitContext.globalCompositeOperation = "destination-in";
    portraitContext.fill(face.mask);
    portraitContext.restore();
    const turned = headRenderer.draw(face.mesh, portrait, -vertical * Math.PI / 16, horizontal * Math.PI / 13);
    context.drawImage(face.body, 0, 0);
    context.drawImage(turned, 0, 0);
  }

  function drawBlink(eye, closure) {
    const { x, y, rx, outline } = eye;
    const shell = context.createLinearGradient(x, y - 22, x + 3, y + 23);
    shell.addColorStop(0, "#fcebe1");
    shell.addColorStop(1, "#fce9df");

    const lid = ease((closure - .72) / .28);
    const upperEdge = y - 29 + 31 * closure;
    const lowerEdge = y + 26 - 24 * closure;
    context.save();
    context.clip(outline);
    context.fillStyle = shell;
    context.fillRect(x - 36, y - 30, 72, upperEdge - y + 30);
    context.fillRect(x - 36, lowerEdge, 72, y + 28 - lowerEdge);
    context.restore();

    context.save();
    context.globalAlpha = lid;
    context.strokeStyle = "#391a20";
    context.lineWidth = 3.3;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(x - rx * .78, y - 1);
    context.quadraticCurveTo(x, y + 12, x + rx * .78, y - 2);
    context.stroke();
    context.restore();
  }

  let pose = null;
  let timer = 0;
  let frame = 0;
  let drawActive = null;
  let eventCount = 0;
  let lookCount = 0;
  const lookDirections = [[-.95, -.15], [.86, -.78], [-.55, -.92], [.95, .30]];

  function clear() {
    drawActive = null;
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvas.hidden = true;
    avatarView.classList.remove("looking");
  }

  function schedule(first = false) {
    const delay = first ? 1700 + Math.random() * 1400 : 2800 + Math.random() * 2700;
    timer = setTimeout(animate, delay);
  }

  function animate() {
    const face = faces[pose];
    const looking = eventCount++ % 3 === 1;
    const [lookX, lookY] = looking ? lookDirections[lookCount++ % lookDirections.length] : [0, 0];
    const duration = looking ? 2450 : 210;
    const started = performance.now();
    canvas.hidden = false;
    avatarView.classList.toggle("looking", looking);

    function paint(elapsed, strength) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      if (looking) {
        const gaze = ease(Math.min(elapsed / 185, (1390 - elapsed) / 270));
        const headTurn = ease(Math.min((elapsed - 65) / 380, (1540 - elapsed) / 390));
        drawHeadLook(face, lookX * headTurn * strength, lookY * headTurn * strength,
          lookX * gaze * strength, lookY * gaze * strength);
      } else {
        const closure = ease(Math.min(elapsed / 67, (duration - elapsed) / 108));
        for (const eye of face.eyes) drawBlink(eye, closure * strength);
      }
      context.restore();
    }

    function tick(now) {
      const elapsed = now - started;
      if (elapsed >= duration) {
        clear();
        schedule();
        return;
      }
      drawActive = (strength) => paint(elapsed, strength);
      drawActive(1);
      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
  }

  return {
    settle() {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      pose = null;
      const draw = drawActive;
      if (!draw || document.hidden) {
        clear();
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const started = performance.now();
        const timeout = setTimeout(finish, 240);
        function finish() {
          clearTimeout(timeout);
          cancelAnimationFrame(frame);
          clear();
          resolve();
        }
        function tick(now) {
          const progress = (now - started) / 150;
          if (progress >= 1) finish();
          else {
            draw(1 - ease(progress));
            frame = requestAnimationFrame(tick);
          }
        }
        frame = requestAnimationFrame(tick);
      });
    },

    sync() {
      const next = getPose();
      if (next === pose) return;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      clear();
      pose = next;
      if (pose) schedule(true);
    },
  };
}
