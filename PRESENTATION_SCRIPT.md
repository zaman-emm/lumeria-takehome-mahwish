# Presentation script: The Skin Report (~14 min + Q&A)

Open `/report/noor` on a real phone (or the phone frame at 375 px). Screen-record a backup first.
**Say** lines are spoken. *Do* lines are what your thumb does. Times are targets; ~150 words per minute.

| Time | Section | Challenge tie-back |
| --- | --- | --- |
| 0:00 | Framing | The three questions |
| 1:15 | Opening and states | Loading, empty, error |
| 2:15 | At a glance | Q1 "How is my skin today?" |
| 5:15 | Play your month | Immersive, on-brand |
| 6:15 | Products | Q3 "What's behind the numbers?" |
| 7:45 | Progress | Q2 "Is it getting better?" |
| 9:15 | Calendar and Photos | Q2, plus the three-light scope |
| 10:45 | Scan sheet | Q3, one scan in depth |
| 11:45 | Lumi | "Something a person comes back to" |
| 12:45 | Other people, close | Robustness, what I cut |

---

## 0:00 Framing (75 s)

**Say:**
"The brief asks three questions: how is my skin today, is it getting better, and what's behind the numbers. I wanted the report to answer them in that order, with one gesture each, and not as three dashboards.

The dataset has a story. Noor starts on a ceramide moisturizer. She tries a retinol and it stings. She flies to Phoenix, and her skin dries out. She stops the retinol, starts azelaic acid, and ends the month at her best score, 72, up from 64. My main design question was: can Noor see that story in about ten seconds, without reading a chart?

Three principles run through everything. First, **lead with the story, not the number.** Second, **say it like Lumeria's big sister**: kind, plain, never clinical. Third, **clues, never causes.** This is a wellness product, so I never claim a product *caused* anything. Let me show you."

---

## 1:15 Opening and states (60 s)

*Do:* Reload `/report/noor`. Let the loader and splash play. Don't tap.

**Say:**
"The API is deliberately slow, 300 milliseconds to 1.2 seconds. I treated that wait as the first moment of the brand, not a spinner. The Lumoscope forms on gold. Then the score ring draws on frosted glass and counts up to 72. Then the glass melts, and the ring *flies* up into its place in the hero. It's one object moving, so the loading screen and the report feel like the same thing.

It plays once per load. A tap skips ahead. And if you've asked your phone for reduced motion, it never plays."

*Do:* Open `/report/noor?fail=1`.

**Say:**
"Errors are written for a person. 'We couldn't open your report. Your scans are safe.' The first thing anxious people need to hear is that nothing was lost. There are three versions: failed, offline and not found, each with its own action. A brand-new user with no scans gets an invitation, not a blank: 'Your report starts with one scan.'"

---

## 2:15 At a glance (3 min) — Question 1

*Do:* Back to `/report/noor`, top of the page.

**Say:**
"This answers *how is my skin today?*

The greeting is first, then the gauge, then a headline. The headline is not '72.' It says **'Calm skin this month.'** The app finds the score that's at its high and climbed furthest, and says that in plain words. If nothing is climbing, it names what's slipping instead, and never hides it. The number is still there, as a sunrise gauge. But a person feels a sentence before they read a digit."

*Do:* Point to the card under the gauge.

**Say:**
"'Up 8 since your first scan,' with the first and latest photos side by side. The progress is shown against *her* starting point, not against anyone else.

One design problem in the data: **higher is always healthier**, even for redness and oiliness. A redness score of 85 means calm skin. That's confusing if you label it 'Redness 85.' So I renamed the scores by what you *want*: **Calm, Oil balance, Clarity, Even tone, Hydration.** Every number now points the same way, so nobody has to translate."

*Do:* Scroll to the month curve. Tap a pin on the band.

**Say:**
"This is the most important thing on the page, and it's the one I'd defend hardest. The month as one curve. Under it, every product and the Phoenix trip sit on their own bands, so the dip lines up with the trip, and the recovery lines up with azelaic acid. The sentence above is written from her data and tagged **'Lumi AI summary'**: **'Retinol stung, Phoenix dried you out, and azelaic acid brought the calm back.'** The word 'stung' comes from her own note. Question two is answered here, before she opens a single tab."

*Do:* Swipe the score cards slowly.

**Say:**
"Five scores as a carousel on a curved arc. The centre card is level and full size, and the neighbours tip away. That's the one place I let the layout play, so the swipe feels physical. Each card shows the change since her first scan, and tapping opens its trend. The two last cards are marked **Preview** with sample numbers and don't open. They show where the scope could go, and I won't fake a real reading."

*Do:* Scroll to the tip and streak.

**Say:**
"One suggestion from the latest scan, labelled **'AI suggestion, not medical advice.'** Then a streak: five weeks in a row, three more for the next badge. It rewards the habit that makes the data work. 'More metrics' folds away, with honest 'Coming soon' rings."

---

## 5:15 Play your month (60 s)

*Do:* Scroll up. Tap **Check your highlights.**

**Say:**
"This is the immersive layer, and it opens out of the button you tapped. It's a story, like the ones people already know how to use: tap to advance, tap a bar to jump, swipe back to close. The phone's back gesture works, because it's in browser history.

Eight slides, each answers one question. 'Let's start with your highs.' 'Look at you, showing up.' 'Your overall score rose 8 points.' Then the hard part: **'Dry air and strong sun showed up as redness. Calm was back above 70 by Oct 16.'** It's honest about the dip, and it ends on hope. Every number comes from the data, and a slide is dropped if the data isn't there. That's why Jordan, who has one scan, gets no story rather than a broken one."

*Do:* Close the story.

---

## 6:15 Products (90 s) — Question 3

*Do:* Tap **Products.** Note the tab content slides in from the right.

**Say:**
"The tab content slides in the direction you moved, so the tabs feel like one row. This tab asks one question per card: **is it working?**

Each card shows the score it lined up with, was to now. Azelaic acid: Calm 54 to 84, with an up arrow and 30. The change is an arrow and a number, the same as everywhere else in the report, so there's one way to read "better". The chart is **dashed before she started, solid after**, with a marker on the start date. You see the 'before' without me explaining it. These charts also read on touch: press and drag, and you get the day, the score and a small haptic tick.

Now look at the retinol card. It stopped Oct 11, 'stinging and redness around the nose,' and it carries a **plane icon: Phoenix overlap.** Retinol and Phoenix hit the same days, so the app says so: 'hard to say which did more.' I'd rather be honest about an ambiguous result than tell a clean, wrong story.

Verdicts say 'improved during use,' never 'it worked.' Ingredient notes are one line, and cited: NHS, Cleveland Clinic. If I couldn't cite it, I left it out."

---

## 7:45 Progress (90 s) — Question 2

*Do:* Tap **Progress.** (It's the report's own tab bar item, labelled **Report** in the app bar.) Press and drag along the chart.

**Say:**
"This is the explorer for *is it getting better?* Pick a spot, since a cheek and a forehead aren't comparable. Pick a score from the ring row, and an arrow marks any score that moved 10 or more. Then **drag your finger along the line.** The pill follows you, the card below shows the scan you're on, and you feel a small haptic tick on each scan. On a desktop mouse, hover does the same. Arrow keys work too.

Tap a product in the legend and its stretch lights up while everything else fades."

*Do:* Scroll to **What lined up.**

**Say:**
"'What lined up' lists the clues: Phoenix, 'humidity 12% against 73% at home, UV up to 10.' Retinol, 'stinging noted twice.' Shorter nights, 'sleep 7.1 to 5.4 hours,' which is why oil balance dipped in deadline week. The caveats carry an info icon, so they read as information, not advice."

---

## 9:15 Calendar and Photos (90 s)

*Do:* Tap **Calendar.** Tap a few days.

**Say:**
"The calendar answers 'how consistent was I, and how did each day go?' Each scan day is a dot shaded in four steps of **one sage-to-forest colour**. I avoided red and green on purpose, because a low day shouldn't feel like a failure. Clay is saved for real attention. Period days and trips are marked. The selection ring slides between days with a spring, and the day card keeps a fixed height, so the page never jumps."

*Do:* Tap **Photos.** Drag the compare slider, then switch the light.

**Say:**
"The photos tab is for the real scope images. Before and now, under a slider that tracks your finger one-to-one, with no easing, because easing would feel like lag. Then switch between **ambient, polarized and UV.** Polarized removes glare, so redness shows beneath the surface, and UV shows oil. That's what's special about Lumeria's hardware, so it's one tap away. Below it, a polaroid wall, or a details view with the notes. Filter by spot."

---

## 10:45 Scan sheet (60 s) — Question 3

*Do:* Tap any scan. The page scales back as the sheet rises.

**Say:**
"Any scan, from anywhere, opens the same sheet, and the page scales back like iOS. This is the deepest layer. The photo is labelled with the light it's in. Every score is a tick row **compared to the last scan of that same spot**, with green or clay change numbers. Then her note, her tags, stress, sleep, steps and HRV, that day's weather, and the products in her routine that day. The suggestion closes it.

The data has gaps, and I designed for them. A score the scope couldn't read says **'Couldn't read this time.'** A failed upload says **'Photo didn't upload,'** with a Try again. The reading is still fine."

---

## 11:45 Lumi (60 s)

*Do:* Tap the orb beside the tab bar.

**Say:**
"The app bar is a floating glass capsule like iOS 26: Home, Report, Scan. Where Music keeps Search, we keep Lumi. She opens with four questions that fit the tab you came from. On Progress it's 'Why did it dip?' On Photos it's 'How do I get comparable photos?'"

*Do:* Ask "Why did it dip?"

**Say:**
"The orb moves into the header and thinks, 'Looking at your scans…', and then the answer writes itself in. Everything is scripted from the report's data. There's no live model, so she can't make something up, and she never diagnoses. 'AI-generated, not medical advice' sits under the input."

---

## 12:45 Other people and close (90 s)

**Say:**
"I checked the design against the other three people. **Jordan** has one scan. The trend explains 'just one scan so far' and the story is skipped. **Maya** has 28 scans over eleven weeks and two areas, so the spot switcher matters. **Sam** has sparse, unsorted data with missing fields. The headline there is honest: 'Spots are showing more lately.'

For accessibility: reduced motion turns off the splash, the arc tilt and the springs. The charts are keyboard-operable sliders. Every chart has a spoken equivalent. Folded sections are properly hidden from screen readers.

**What I cut or would do next:** Home and Scan tabs, profile and tag editing are visible but not wired. Gentler product swaps are built but hidden behind a flag. Pores and radiance are previews that need real image analysis. I didn't build dark mode.

**To close:** the brief asked for a report someone would *want* to open and come back to. The answer here is a month that tells Noor her own story, honestly, in her own words. I'm happy to take questions."

---

### If you're running long, cut in this order
1. Calendar detail (keep one line on single-hue shading).
2. The `?fail=1` demo (say it, don't show it).
3. Progress legend focus.

### Likely Q&A, one-line answers
- **Why scripted Lumi?** Safe, instant, and it can't contradict the data. A live model is the next step, with these answers as guardrails.
- **Why rename Redness to Calm?** The API says higher is healthier. The name has to point the same way as the number.
- **Which extra data did you assume?** Radiance (derived), Pores and Spots (previews), skin type (profile only), under eyes and food log (coming soon). All labelled in the UI and listed in `SUBMISSION.md`.
- **How did you use AI?** *(fill in honestly, since they will ask you to walk through the code)*
