import test from "node:test";
import assert from "node:assert/strict";
import { buildFeedQuery, coverLetterHref, dateInputValue, matchTone, safeApplyUrl, stageFor, statusOf, timeAgo } from "./jobsFeed";

test("jobs feed helpers: status mapping, match tone, safe links, query string", () => {
  assert.equal(statusOf("shortlist"), "saved");
  assert.equal(statusOf("recommended"), "saved");
  assert.equal(statusOf("auto_apply"), "saved");
  assert.equal(statusOf("offer"), "offer");
  assert.equal(stageFor("saved"), "shortlist");
  assert.equal(stageFor("rejected"), "rejected");
  assert.deepEqual([matchTone(85), matchTone(50), matchTone(10)], ["high", "mid", "low"]);
  assert.equal(safeApplyUrl("javascript:alert(1)"), null);
  assert.equal(safeApplyUrl("http://x.y/z"), null);
  assert.equal(safeApplyUrl("https://remoteok.com/x"), "https://remoteok.com/x");
  assert.equal(buildFeedQuery({ resumeId: "r1", q: "  devops ", remote: true, source: "remotive", sort: "match", page: 1 }), "resumeId=r1&q=devops&remote=true&source=remotive&sort=match");
  assert.equal(buildFeedQuery({ page: 3 }), "page=3");
});

test("jobs feed helpers: time ago, date input, cover letter link", () => {
  const now = new Date("2026-11-28T12:00:00Z");
  assert.equal(timeAgo("2026-11-28T11:59:30Z", now), "just now");
  assert.equal(timeAgo("2026-11-28T11:55:00Z", now), "5 min ago");
  assert.equal(timeAgo("2026-11-28T09:00:00Z", now), "3 h ago");
  assert.equal(timeAgo("2026-11-27T12:00:00Z", now), "1 day ago");
  assert.equal(timeAgo(null, now), "");
  assert.equal(dateInputValue("2026-12-02T00:00:00.000Z"), "2026-12-02");
  assert.equal(
    coverLetterHref({ id: "j1", title: "DevOps Engineer", company: "Acme & Co" }, "r1"),
    "/user/cover-letters?new=1&title=DevOps+Engineer&company=Acme+%26+Co&resume=r1&job=j1"
  );
});
