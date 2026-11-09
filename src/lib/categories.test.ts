/**
 * Category inference tests. Titles are real ones from the app, so a rule
 * change that regroups someone's dashboard shows up here first.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { categorize } from "./categories.ts";

test("exercise titles land in sport & fitness", () => {
  for (const t of [
    "Do 10 squats daily",
    "100 push ups daily",
    "Run 5 km daily 🏃",
    "Run 5k on Saturdays",
    "Gym 3x a week",
    "🏋️ lift",
  ]) {
    assert.equal(categorize(t), "fitness", t);
  }
});

test("reading and study titles land in reading & learning", () => {
  for (const t of [
    "Read 10 pages",
    "Read 20 pages a day",
    "Learn biology every Thursday",
    "Practise Spanish on Duolingo",
  ]) {
    assert.equal(categorize(t), "learning", t);
  }
});

test("recovery, food and mind each get their own group", () => {
  assert.equal(categorize("Cold plunge daily 🥶"), "health");
  assert.equal(categorize("Do cold plunge every Thursday"), "health");
  assert.equal(categorize("Drink 2L water"), "health");
  assert.equal(categorize("Cook meal every day 🥦"), "food");
  assert.equal(categorize("No sugar after lunch"), "food");
  assert.equal(categorize("Meditate 10 minutes 🧘"), "mind");
  assert.equal(categorize("No phone after 10pm"), "mind");
});

test("anything unrecognised falls back to other", () => {
  assert.equal(categorize("Call grandma"), "other");
  assert.equal(categorize(""), "other");
});

test("word boundaries: 'ran' inside a word doesn't count as running", () => {
  assert.equal(categorize("Eat an orange"), "food");
  assert.equal(categorize("Tidy the garage"), "other");
});
