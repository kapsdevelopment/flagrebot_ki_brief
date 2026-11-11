"use strict";

function createRigidHeadRenderer() {
  const output = document.createElement("canvas");
  output.width = output.height = 512;
  const gl = output.getContext("webgl", { alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
  if (!gl) return null;

  const vertexSource = `
    attribute vec3 point;
    uniform vec2 pivot;
    uniform float pitch;
    uniform float yaw;
    varying mediump vec2 uv;

    void main() {
      uv = point.xy / 512.;
      vec3 relative = point - vec3(pivot, 0.);
      float cp = cos(pitch), sp = sin(pitch);
      float cy = cos(yaw), sy = sin(yaw);
      vec3 pitched = vec3(relative.x, cp * relative.y - sp * relative.z, sp * relative.y + cp * relative.z);
      vec3 turned = vec3(cy * pitched.x + sy * pitched.z, pitched.y, -sy * pitched.x + cy * pitched.z);
      vec2 screen = turned.xy + pivot;
      gl_Position = vec4(screen.x / 256. - 1., 1. - screen.y / 256., -turned.z / 1024., 1.);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    uniform sampler2D illustration;
    varying mediump vec2 uv;
    void main() {
      vec4 color = texture2D(illustration, uv);
      if (color.a < .004) discard;
      gl_FragColor = color;
    }
  `;

  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const point = gl.getAttribLocation(program, "point");
  gl.enableVertexAttribArray(point);
  const pivotUniform = gl.getUniformLocation(program, "pivot");
  const pitchUniform = gl.getUniformLocation(program, "pitch");
  const yawUniform = gl.getUniformLocation(program, "yaw");

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.uniform1i(gl.getUniformLocation(program, "illustration"), 0);
  gl.enable(gl.DEPTH_TEST);
  gl.viewport(0, 0, 512, 512);

  return {
    createMesh({ pivot, profile }) {
      const vertices = [];
      const [centerX, centerY, radiusX, radiusY] = profile;
      const bottom = Math.ceil(pivot[1] / 8) * 8 + 8;
      const corners = [[0, 0], [8, 0], [0, 8], [0, 8], [8, 0], [8, 8]];
      for (let y = 0; y < bottom; y += 8) {
        for (let x = 0; x < 512; x += 8) {
          for (const [dx, dy] of corners) {
            const px = x + dx;
            const py = y + dy;
            const depth = 55 * Math.max(0, 1 - ((px - centerX) / radiusX) ** 2 - ((py - centerY) / radiusY) ** 2);
            vertices.push(px, py, depth);
          }
        }
      }
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      return { buffer, count: vertices.length / 3, pivot };
    },

    draw(mesh, illustration, pitch, yaw) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, illustration);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
      gl.vertexAttribPointer(point, 3, gl.FLOAT, false, 0, 0);
      gl.uniform2f(pivotUniform, ...mesh.pivot);
      gl.uniform1f(pitchUniform, pitch);
      gl.uniform1f(yawUniform, yaw);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
      return output;
    },
  };
}
