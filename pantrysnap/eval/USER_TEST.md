# User test — 10–15 people

Goal: find out whether people prefer PantrySnap to figure out what they can make with the
food they already have. This is a test of the concept, not of the UI polish.

## Before the sessions

1. App deployed with the real AI (see the root README "Real testing setup").
2. Mark each participant's account as a tester (`profiles.is_pro = true`, set by an admin in
   the database) so the 3-tries-per-month limit doesn't cut the session short. The daily
   abuse cap (40 AI calls) still applies.
3. Print or open `templates/user-session.csv` (one row per participant) and
   `templates/chatgpt-comparison.csv`.

## Who

10–15 adults who cook at home at least twice a week, mixed household sizes, not friends who
already know the idea. Sessions happen **in their own kitchen**, ideally at the time they'd
normally decide dinner. 30–40 minutes each.

## Session script

1. **Context (2 min).** "We're testing an app that helps decide what to cook from what you
   have. We're testing the app, not you. Think aloud." Don't explain how it works.
2. **Baseline question.** "How do you usually decide what to cook when you don't know?" Write it down.
3. **Task A — PantrySnap, their choice of input (10 min).** "Use this to find something you'd
   actually make tonight." Don't say Scan or Type — note which they pick and why.
   Stop when they pick a recipe or give up.
4. **Task B — the other input mode (5 min).** Same goal with the mode they didn't pick.
5. **ChatGPT comparison (10 min).** Follow CHATGPT_COMPARISON.md with the same photo/request.
   Alternate the order between participants.
6. **Debrief (5 min).** Questions below.
7. **Follow-up (next day, message).** "Did you cook anything from yesterday's session? What?"

## What to record (user-session.csv)

- Input mode chosen first, and why (their words).
- Taps/time: start → ingredient list shown → recipes shown → recipe chosen (stopwatch).
- Ingredient corrections made (count) and **errors they did not notice** (check the kitchen).
- Whether any "Everything on hand" claim was wrong for them.
- Moments of confusion or hesitation (quote them).
- Recipe chosen, and whether they'd cook it (YES/MAYBE/NO).
- Did they cook it (next-day follow-up).
- Preference vs ChatGPT and why.
- Would they use it again next week? What would make them stop?

The app also logs, without ingredient lists or photos: input mode, scan outcome, edits
added/removed/renamed, recipes shown, recipe opened and position, and the in-app
"Did you make it?" / "Was this useful?" answers (table `app_events`).

## Debrief questions (ask all, in this order)

1. "What did you expect to happen when you took the photo / typed your list?"
2. "Was anything it showed you wrong? Did you trust the ingredient list?"
3. "Scan or type — which would you use next time? Why?"
4. "Was there a recipe you'd genuinely make? What made it good or not?"
5. "How is this different from how you normally decide, or from asking ChatGPT?"
6. "When would you open this again? When wouldn't you?"
7. "What almost made you give up?"

## Rules

- Never help unless they are fully stuck for >60 s; record that you helped.
- Don't defend the app or explain failures during the session.
- Record failures and negative answers with the same care as positive ones.
