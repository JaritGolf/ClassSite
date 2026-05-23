# Audit 11: Republic Challenge (Phase 11)

Spec reference: Section 36.12

---

- [x] 1. All review modes (Section 30.2) function.
      Verified by `tests/integration/audit11/01-modes-all-function.test.ts`
      (7 modes: Quick Review, Category Challenge, Mixed Mission, Mistake
      Replay, Source Sprint, Endurance Trial, Final Republic Trial).
- [x] 2. Blueprint-weighted generation produces distribution within 5% of
      target weights.
      Verified by `tests/integration/audit11/02-blueprint-within-5pct.test.ts`
      and `tests/unit/republic-challenge/blueprint.test.ts` (n = 10, 15, 20,
      30, 40, 50, 60).
- [x] 3. Stamina ladder enforces session length by time of year.
      Verified by `tests/integration/audit11/03-stamina-by-date.test.ts` and
      `tests/unit/republic-challenge/stamina.test.ts` (Aug-Oct = 10, Nov-Dec
      = 15, Jan-Feb = 20, Mar = 30, Apr = 40, late-Apr/May → Final Trial).
- [x] 4. Final Republic Trial uses level 2 and 3 stimuli only.
      Verified by `tests/integration/audit11/04-final-trial-stimuli.test.ts`.
- [x] 5. Confidence ratings required on all challenge items.
      Verified by `tests/integration/audit11/05-confidence-required.test.ts`
      (REPUBLIC_CHALLENGE and FINAL_TRIAL).
- [x] 6. Teacher can configure session length, attempts allowed, review
      window.
      Verified by `tests/integration/audit11/06-teacher-config.test.ts` and
      the teacher Settings page at `/teacher/classes/[classId]/settings`.

---

## Manual verification procedures

### Item 1 — Walk every mode in the live app

1. Sign in as mock student.
2. Visit `/student/republic-challenge`.
3. Click each of the seven mode cards and verify the session loads.
4. Confirm:
   - Quick Review delivers up to 5 questions.
   - Category Challenge picker → choose a category → ten questions.
   - Mixed Mission delivers a mix proportional to the blueprint.
   - Mistake Replay shows previously missed questions (or an empty pool
     message if the student has no misses).
   - Source Sprint picker → choose a stimulus type → ten questions of that
     type.
   - Endurance Trial length matches the stamina ladder for today.
   - Final Republic Trial card is disabled before April 1 and enabled after.

### Item 6 — Teacher settings round-trip

1. Sign in as mock teacher.
2. Visit `/teacher/classes`.
3. Click "Settings" beside a class.
4. Change session-length override to `12`, attempts allowed to `2`, review
   window to "After class window closes", stamina override to `8`, and
   toggle off "Republic Challenge".
5. Click "Save settings".
6. Reload the page — the saved values should persist.
7. Re-enable Republic Challenge and save again.
8. As the mock student in that class, visit `/student/republic-challenge`.
9. Confirm Quick Review and Mixed Mission cards show `12 questions` and
   Endurance Trial shows `8 questions`.
10. ✅ Check this item off when confirmed.

### Optional — End-to-end Final Trial walkthrough

1. As mock teacher, on the class Settings page set `rcAttemptsAllowed = 1`.
2. As mock student, visit `/student/republic-challenge`. (You may need to
   temporarily edit `finalTrial.open` in
   `src/app/api/republic-challenge/config/route.ts` to bypass the April
   date gate during dev testing.)
3. Click "Final Republic Trial" → confirm intro warns about no mid-test
   feedback and level-2/3 stimuli only.
4. Submit the trial — confirm only the score is shown (no per-item feedback).
5. Try to start a second Final Trial — should return 403 ATTEMPTS_EXHAUSTED.
