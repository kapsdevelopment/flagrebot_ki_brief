"use strict";

function drawPirouetteFrame(context, image, turn, x, y, scale) {
  const cellWidth = Math.floor(image.naturalWidth / 4);
  const cellHeight = Math.floor(image.naturalHeight / 2);
  // Position of the planted sole within each cell.
  const pivots = [[220, 423], [228, 423], [222, 422], [222, 422], [232, 423], [220, 423], [212, 423], [206, 424]];
  const index = Math.round(turn * pivots.length) % pivots.length;
  const [pivotX, pivotY] = pivots[index];
  context.save();
  context.translate(x, y);
  context.rotate(Math.sin(turn * Math.PI * 2) * .035);
  context.scale(scale, scale);
  context.drawImage(
    image, (index % 4) * cellWidth, Math.floor(index / 4) * cellHeight, cellWidth, cellHeight,
    -pivotX, -pivotY, cellWidth, cellHeight,
  );
  context.restore();
}
