# Submission

**Link:** <!-- https://your-project.vercel.app, or wherever we can open and use it -->

**Time spent:** <!-- roughly -->

## What I built

<!-- A short tour. What should we look at first? -->

## Key decisions

<!-- What did you emphasise, and why? What trade-offs did you make? -->

## Extra data I assumed

<!-- Anything beyond the mock API you assumed we could collect, and where you mocked it. -->

All extras are added on the client in `lib/extended.ts`. The API and `data/` are untouched. Each extra is labelled in the UI so nobody mistakes it for a real reading.

| Addition | How it's handled | Why it's worth it |
| --- | --- | --- |
| **Radiance** | *Derived*: the average of hydration and even tone. It's labelled "Derived" everywhere and is not presented as a separate measurement. | It's the glow people actually notice, and it blends two scores we already have into one feeling. |
| **Pores** | *Preview*: stands in for a dedicated photo-analysis step on the UV image. It's only shown on scans that have a photo. | Pores are a top texture concern. Texture scores alone can't measure them, so this needs its own image analysis. |
| **Spots** | *Preview*: stands in for photo analysis that counts separate marks. It's only shown on scans that have a photo. | Clarity follows overall tone. Spots follow the individual marks people point at in a mirror. |
| **Skin type** | Shown as *profile context*: "From your profile". It is never detected or inferred. If it's missing (sam), the report asks the person to add it. | It helps tips fit the person without turning into a diagnosis. |
| **Under eyes (dark circles)** | Shown as *coming soon*. Cheek, forehead and chin scans can't support it, so it needs a future under-eye scan. | Under eyes would respond to sleep within days, so it would make the sleep connection visible quickly. |
| **Food log** | Shown as a locked source in "What we can connect". | Diet changes are a common question, but the logging is complex, so it's left for later. |

| **Gentler swaps** | Mocked in `lib/routine.ts`: a short list of alternatives with a price tier, and a `$$` budget the report highlights. | When a product is stopped, the next question is what to use instead, at a price the person already pays. |
| **14-day trial** | `TRIAL_DAYS` in `lib/routine.ts`: a product started in the last two weeks shows "day N of 14". | Two weeks is long enough to see a change and short enough to keep people scanning. |

The streaks and milestones (`lib/weeks.ts`) and the Play your month slides (`lib/recap.ts`) are computed from the existing scans, products, factors and weather. They need no extra data, and a slide is skipped when its data is missing (jordan has one scan, so there is no recap).

## What I cut / would do next

<!-- With another day or week, what would you change or add? -->

## How I used AI tools

<!-- Which tools, for what, and where you overrode them. -->

## Anything else

<!-- Things you'd ask the team, assumptions you made, bugs you know about. -->
