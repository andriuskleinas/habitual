/**
 * Scoring engine tests. Run with `npm test` (Node's built-in runner, no deps).
 *
 * Every case pins `today` explicitly so nothing depends on the real clock.
 * 2026-10-05 is a Monday; most fixtures are anchored on it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addDays,
  addMonths,
  evaluateChallenge,
  resolveSkipsAllowed,
  resolveStartDate,
  schedulePeriods,
  type CheckInLike,
} from "./challenges.ts";

const MON = "2026-10-05";

/** Check-ins on each of the given day offsets from `start`. */
function on(start: string, ...offsets: number[]): CheckInLike[] {
  return offsets.map((n) => ({ date: addDays(start, n) }));
}

/* ---------------------------------- dates --------------------------------- */

test("addDays crosses month and year boundaries", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("addMonths clamps to the end of a short month", () => {
  assert.equal(addMonths("2027-01-31", 1), "2027-02-28");
  assert.equal(addMonths("2028-01-31", 1), "2028-02-29"); // leap year
  assert.equal(addMonths("2026-05-15", 1), "2026-06-15");
});

test("resolveStartDate 'monday' always means the next Monday", () => {
  assert.equal(resolveStartDate("monday", MON), "2026-10-12");
  assert.equal(resolveStartDate("monday", "2026-10-03"), MON); // from a Saturday
  assert.equal(resolveStartDate("tomorrow", MON), "2026-10-06");
  assert.equal(resolveStartDate("today", MON), MON);
});

/* --------------------------------- periods -------------------------------- */

test("weekdays cadence skips Saturday and Sunday", () => {
  const periods = schedulePeriods({
    cadence: "weekdays",
    startDate: MON,
    endDate: addDays(MON, 13),
  });
  assert.equal(periods.length, 10);
});

test("weekly_on produces one period per matching weekday", () => {
  const periods = schedulePeriods({
    cadence: "weekly_on",
    cadenceWeekday: 3, // Wednesday
    startDate: MON,
    endDate: addDays(MON, 27),
  });
  assert.deepEqual(
    periods.map((p) => p.start),
    ["2026-10-07", "2026-10-14", "2026-10-21", "2026-10-28"],
  );
});

test("block cadences drop a trailing partial block", () => {
  // 30 days = four whole weeks plus two spare days: four periods, not five.
  const periods = schedulePeriods({
    cadence: "weekly",
    startDate: MON,
    endDate: addDays(MON, 29),
  });
  assert.equal(periods.length, 4);
  assert.deepEqual(periods[0], { start: MON, end: "2026-10-11" });
});

test("monthly blocks are anchored on the start date", () => {
  const periods = schedulePeriods({
    cadence: "monthly",
    startDate: "2027-01-31",
    endDate: "2027-04-28", // one day short of the third month
  });
  assert.deepEqual(periods, [
    { start: "2027-01-31", end: "2027-02-27" },
    { start: "2027-02-28", end: "2027-03-30" },
  ]);
});

/* -------------------------------- allowance ------------------------------- */

test("resolveSkipsAllowed rounds a percentage down", () => {
  assert.equal(resolveSkipsAllowed("percent", 10, 30), 3);
  assert.equal(resolveSkipsAllowed("percent", 10, 29), 2);
  assert.equal(resolveSkipsAllowed("count", 2, 30), 2);
  assert.equal(resolveSkipsAllowed(null, null, 30), null);
  assert.equal(resolveSkipsAllowed("percent", 10, null), null); // open-ended
});

/* ------------------------------- evaluation ------------------------------- */

const daily = { cadence: "daily", startDate: MON, endDate: addDays(MON, 6) };

test("an unfilled current period does not break the streak", () => {
  const today = addDays(MON, 3);
  const ev = evaluateChallenge(daily, on(MON, 0, 1, 2), today);
  assert.equal(ev.streak, 3);
  assert.equal(ev.dueNow, true);
  assert.equal(ev.missedPeriods, 0);
  assert.equal(ev.status, "active");
});

test("a fully elapsed empty period resets the streak", () => {
  const today = addDays(MON, 4);
  const ev = evaluateChallenge(daily, on(MON, 0, 1, 2), today);
  assert.equal(ev.streak, 0);
  assert.equal(ev.bestStreak, 3);
  assert.equal(ev.missedPeriods, 1);
});

test("going over the skip budget fails the challenge", () => {
  const rules = { ...daily, allowanceMode: "count", allowanceValue: 1 };
  const today = addDays(MON, 5);

  const within = evaluateChallenge(rules, on(MON, 0, 1, 3, 4), today);
  assert.equal(within.status, "active");
  assert.equal(within.skipsLeft, 0);

  const over = evaluateChallenge(rules, on(MON, 0, 3, 4), today);
  assert.equal(over.status, "failed");
  assert.equal(over.failReason, "skips");
});

test("the back-to-back rule fails a run even with skips in the bank", () => {
  const rules = { ...daily, allowanceMode: "count", allowanceValue: 5, maxMissesInRow: 1 };
  const ev = evaluateChallenge(rules, on(MON, 0, 3), addDays(MON, 4));
  assert.equal(ev.worstMissRun, 2);
  assert.equal(ev.status, "failed");
  assert.equal(ev.failReason, "in-a-row");
});

test("a tick challenge that reaches its end date is won", () => {
  const ev = evaluateChallenge(daily, on(MON, 0, 1, 2, 4, 5, 6), addDays(MON, 7));
  assert.equal(ev.isEnded, true);
  assert.equal(ev.status, "won");
  assert.equal(ev.percent, 86); // 6 of 7
});

test("a challenge that hasn't started yet is upcoming", () => {
  const ev = evaluateChallenge(daily, [], addDays(MON, -2));
  assert.equal(ev.status, "upcoming");
  assert.equal(ev.streak, 0);
});

test("a total challenge wins as soon as the target is hit", () => {
  const rules = { ...daily, totalTarget: 100 };
  const checkIns = [
    { date: MON, value: 60 },
    { date: addDays(MON, 1), value: 45 },
  ];
  const ev = evaluateChallenge(rules, checkIns, addDays(MON, 2));
  assert.equal(ev.mode, "total");
  assert.equal(ev.status, "won");
  assert.equal(ev.percent, 100);
  assert.equal(ev.totalRemaining, 0);
});

test("a total challenge that ends short is failed, and pace shows the gap", () => {
  const rules = { ...daily, totalTarget: 70 };
  const midway = evaluateChallenge(rules, [{ date: MON, value: 10 }], addDays(MON, 3));
  // Even pace by the end of day 4 is 40; 10 logged → 30 behind.
  assert.equal(midway.pace, -30);
  assert.equal(midway.perCheckInToFinish, 15); // 60 left over 4 periods

  const ended = evaluateChallenge(rules, [{ date: MON, value: 10 }], addDays(MON, 7));
  assert.equal(ended.status, "failed");
  assert.equal(ended.failReason, "total");
});

test("weekly streaks count weeks, not days", () => {
  const rules = { cadence: "weekly", startDate: MON, endDate: addDays(MON, 27) };
  const ev = evaluateChallenge(rules, on(MON, 2, 9, 18), addDays(MON, 22));
  assert.equal(ev.streak, 3);
  assert.equal(ev.dueNow, true);
  assert.equal(ev.totalPeriods, 4);
});
