/**
 * Preloaded into `next start` (node --require ./server-timeouts.cjs ...; see logs/start-frontend.cmd).
 *
 * Node's HTTP server drops any request whose body takes longer than 5 minutes (server.requestTimeout,
 * default 300 000 ms), and `next start` has no option for it. A 100 MB audio upload on a slow line
 * takes longer than that, so the limit is raised for every server Next creates. Header timeouts stay
 * short (60 s), so slow-loris style connections are still closed.
 */
const http = require("node:http");

const REQUEST_TIMEOUT_MS = Math.max(60_000, Number(process.env.AUDIO_UPLOAD_TIMEOUT_MS) || 60 * 60_000) + 60_000;
const HEADERS_TIMEOUT_MS = 60_000;

function apply(server) {
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  server.headersTimeout = HEADERS_TIMEOUT_MS;
  return server;
}

const listen = http.Server.prototype.listen;
http.Server.prototype.listen = function patchedListen(...args) {
  apply(this);
  return listen.apply(this, args);
};

module.exports = { REQUEST_TIMEOUT_MS, HEADERS_TIMEOUT_MS, apply };
