# Audit 8: Student Game UI (Phase 8)

Spec reference: Section 36.9

---

- [ ] 1. Dashboard renders current mission, daily drill CTA, badges, readiness meter with confidence interval.
- [ ] 2. Map renders unit/region structure with mastery state.
- [ ] 3. Mission page implements full template: pre-check → briefing → vocab → training → scenario lab → readiness check → mastery challenge.
- [ ] 4. Daily drill page pulls from spaced retrieval queue.
- [ ] 5. Badges render correctly with criteria explanation.
- [ ] 6. Streaks include freeze tokens; no streak loss for short absences.
- [ ] 7. (Manual) Pause-point suggestion appears at configurable time threshold.
- [ ] 8. (Manual) Narrative NPCs render and are skippable.
- [ ] 9. No public score leaderboards present.

---

## Manual verification procedures

### Item 7 — Pause-point banner

1. Sign in as mock student.
2. Go to `/student/settings`, set `pausePointMinutes` to `1`.
3. Open any mission page (`/student/map` → click a mission).
4. Wait 60 seconds without navigating away.
5. **Expected:** Fixed bottom-center banner appears: "Time for a break — your progress is saved."
6. Click the × button.
7. **Expected:** Banner dismisses and does not reappear for the remainder of the page session.
8. Verify progress state is unchanged (no data lost on dismiss).
9. ✅ Check this item off when confirmed.

### Item 8 — Narrative NPC overlay skippable

1. Clear `NarrativeProgress` rows for the mock student (or use a fresh student with no progress):
   ```sql
   DELETE FROM narrative_progress WHERE student_id = (
     SELECT id FROM students WHERE user_id = (
       SELECT id FROM users WHERE clever_id = 'mock-student-001'
     )
   );
   ```
2. Navigate to `/student/dashboard` — the Founder beat overlay should appear as a `<dialog>` modal.
3. Press **ESC** — overlay closes; `POST /api/narrative/[unitId]/read` fires (check Network tab).
4. Navigate away and back to `/student/dashboard` — overlay does **NOT** appear again for the same beat.
5. Go to `/student/settings`, toggle "Skip NPC dialogue" **ON**.
6. Navigate to `/student/dashboard` — no overlay appears.
7. Toggle "Skip NPC dialogue" **OFF** — overlay resumes for unread beats.
8. ✅ Check this item off when confirmed.
