import React, { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  DEFAULT_ITEMS,
  formatDuration,
  getIntervalSeconds,
  getNextItemIndex,
  makeSessionSummary,
  parsePracticeItems
} from "./practiceEngine.js";
import { playPracticeBeep, preparePracticeBeep } from "./audioCue.js";
import "./styles.css";

const initialSettings = {
  timerMode: "fixed",
  fixedMinutes: 3,
  minMinutes: 3,
  maxMinutes: 5,
  orderMode: "ordered"
};

function App() {
  const [itemText, setItemText] = useState(DEFAULT_ITEMS.join("\n"));
  const [settings, setSettings] = useState(initialSettings);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [duration, setDuration] = useState(getIntervalSeconds(initialSettings));
  const [remaining, setRemaining] = useState(getIntervalSeconds(initialSettings));
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);

  const items = useMemo(() => parsePracticeItems(itemText), [itemText]);
  const currentItem = items[currentIndex] ?? "Add a practice item";
  const progress = duration > 0 ? ((duration - remaining) / duration) * 100 : 0;
  const canStart = items.length > 0 && getIntervalSeconds(settings) > 0;

  function clearTimer() {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function scheduleNextTick() {
    clearTimer();
    intervalRef.current = window.setInterval(() => {
      setRemaining((value) => {
        if (value > 1) return value - 1;
        return completeTimerBlock();
      });
    }, 1000);
  }

  function startSession() {
    if (!canStart) return;
    preparePracticeBeep(audioContextRef);
    const nextDuration = getIntervalSeconds(settings);
    const safeIndex = Math.min(currentIndex, Math.max(items.length - 1, 0));
    setCurrentIndex(safeIndex);
    setDuration(nextDuration);
    setRemaining(nextDuration);
    setRunning(true);
    scheduleNextTick();
  }

  function pauseSession() {
    clearTimer();
    setRunning(false);
  }

  function resetSession() {
    clearTimer();
    const nextDuration = getIntervalSeconds(settings);
    setCurrentIndex(0);
    setDuration(nextDuration);
    setRemaining(nextDuration);
    setRunning(false);
  }

  function advanceItem({ resetRemaining = true } = {}) {
    const nextDuration = getIntervalSeconds(settings);
    setCurrentIndex((index) =>
      getNextItemIndex({
        currentIndex: Math.min(index, items.length - 1),
        itemCount: items.length,
        orderMode: settings.orderMode
      })
    );
    setDuration(nextDuration);
    if (resetRemaining) setRemaining(nextDuration);
    return nextDuration;
  }

  function completeTimerBlock() {
    playPracticeBeep(audioContextRef);
    return advanceItem({ resetRemaining: false });
  }

  function updateSetting(key, value) {
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    if (!running && key !== "orderMode") {
      const nextDuration = getIntervalSeconds(nextSettings);
      setDuration(nextDuration);
      setRemaining(nextDuration);
    }
  }

  return (
    <main className="app-shell">
      <section className="timer-panel" aria-labelledby="app-title">
        <div className="timer-copy">
          <p className="eyebrow">Interleaved Practice</p>
          <h1 id="app-title">Practice what comes next, not what feels easiest.</h1>
          <p>
            Set short blocks, rotate through sections, and let the timer pull you
            into the next rep before your brain settles into autopilot.
          </p>
        </div>

        <div className="timer-face" aria-live="polite">
          <div
            className="progress-ring"
            style={{ "--progress": `${Math.min(progress, 100)}%` }}
          >
            <span className="time" data-testid="remaining-time">
              {formatDuration(remaining)}
            </span>
          </div>
          <div className="current-label">Now practicing</div>
          <div className="current-item" data-testid="current-item">
            {currentItem}
          </div>
          <div className="session-summary" data-testid="session-summary">
            {makeSessionSummary({ items, settings })}
          </div>
          <div className="button-row">
            {running ? (
              <button type="button" className="primary" onClick={pauseSession}>
                Pause
              </button>
            ) : (
              <button
                type="button"
                className="primary"
                onClick={startSession}
                disabled={!canStart}
              >
                Start
              </button>
            )}
            <button type="button" onClick={advanceItem} disabled={items.length === 0}>
              Next
            </button>
            <button type="button" onClick={resetSession}>
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="controls-grid" aria-label="Timer settings">
        <div className="control-block">
          <label htmlFor="items">Practice items</label>
          <textarea
            id="items"
            value={itemText}
            onChange={(event) => {
              setItemText(event.target.value);
              setCurrentIndex(0);
            }}
            rows={8}
            placeholder="Bach m. 17-24&#10;Shift exercise&#10;Run-through ending"
          />
          <span className="hint">One per line, or separate short names with commas.</span>
        </div>

        <div className="control-block">
          <fieldset>
            <legend>Timer length</legend>
            <div className="segmented">
              <label>
                <input
                  type="radio"
                  name="timer-mode"
                  checked={settings.timerMode === "fixed"}
                  onChange={() => updateSetting("timerMode", "fixed")}
                />
                Fixed
              </label>
              <label>
                <input
                  type="radio"
                  name="timer-mode"
                  checked={settings.timerMode === "range"}
                  onChange={() => updateSetting("timerMode", "range")}
                />
                Random range
              </label>
            </div>
          </fieldset>

          {settings.timerMode === "fixed" ? (
            <label htmlFor="fixed-minutes">
              Minutes per item
              <input
                id="fixed-minutes"
                type="number"
                min="0.1"
                step="0.1"
                value={settings.fixedMinutes}
                onChange={(event) => updateSetting("fixedMinutes", event.target.value)}
              />
            </label>
          ) : (
            <div className="range-row">
              <label htmlFor="min-minutes">
                Min minutes
                <input
                  id="min-minutes"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={settings.minMinutes}
                  onChange={(event) => updateSetting("minMinutes", event.target.value)}
                />
              </label>
              <label htmlFor="max-minutes">
                Max minutes
                <input
                  id="max-minutes"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={settings.maxMinutes}
                  onChange={(event) => updateSetting("maxMinutes", event.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        <div className="control-block">
          <fieldset>
            <legend>Practice order</legend>
            <div className="segmented">
              <label>
                <input
                  type="radio"
                  name="order-mode"
                  checked={settings.orderMode === "ordered"}
                  onChange={() => updateSetting("orderMode", "ordered")}
                />
                In order
              </label>
              <label>
                <input
                  type="radio"
                  name="order-mode"
                  checked={settings.orderMode === "random"}
                  onChange={() => updateSetting("orderMode", "random")}
                />
                Random
              </label>
            </div>
          </fieldset>
          <div className="method-note">
            For interleaving, keep blocks short enough that each switch demands
            a fresh retrieval attempt. Random timing and random order can make
            the next task less predictable when you want that extra challenge.
          </div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
