# Hidden Sakura — Game Design Document (MVP Soft Launch)

> **Genre**: Casual Merge-2 / Merge-3
> **Platforms**: iOS, Android (portrait, F2P)
> **Comps**: Merge Gardens, Merge Cruise, EverMerge
> **Audience**: Women 25–45 (primary), kids 8–14 (secondary), cozy-game fans
> **Tone**: Studio Ghibli–adjacent — wholesome, awe-driven, gentle mystery
> **Status**: GDD v0.1 — MVP scope

---

## 1. Vision & Pillars

- **One-line pitch**: Step through a hidden torii gate into a forgotten spirit village hidden in the foothills of Mt. Fuji — merge sakura, sushi, and lanterns to restore the village and uncover its quiet magic.
- **Design pillars**:
  - **Cozy, not anxious** — no fail states, no timers blocking merges, no PvP
  - **Always-productive 5 minutes** — every session ends with visible progress
  - **Beautiful before/after** — restoration is the emotional payoff, not the merging itself
  - **Family-safe monetization** — cosmetic-led, no manipulative urgency, parent-trustworthy

---

## 2. Target Audience & Market

- **Primary persona**: "Casual cozy player" — 30s woman, plays 2–3 short sessions/day on commute/lunch/before bed
- **Secondary**: Tween/teen fans of anime aesthetic and Japanese culture
- **Tertiary**: Parents looking for shared screen time with kids
- **Market position**: Differentiated from Merge Gardens by stronger thematic identity (Japanese spirit world) and softer monetization

---

## 3. Core Gameplay Loop

```
TAP generator -> SPAWN base item -> MERGE pairs -> COMPLETE quest
   |                                                       |
   +-- earn coins/XP --> spend on Restoration <-- unlock new chains/zones
```

- **Session shape (target 5 min)**:
  1. Open app — daily blessing from Hana (Miko) + login reward
  2. Spend ~80 energy across generators to fill board
  3. Complete 2–4 quests for coins/XP
  4. Spend coins on one zone restoration step
  5. See visible village transformation, close app satisfied

---

## 4. Core Mechanics

### 4.1 Merge System

- **Merge-2** drag-and-drop (cleaner than merge-3 for casual audience; matches Merge Gardens)
- **Two identical items** of tier N combine into one tier N+1
- **Chain lengths**: 7 tiers per chain at MVP (extensible to 9 post-launch)
- **Bubble-wrapped items**: Items spawned from generators arrive wrapped — one tap to unwrap, costs no energy, adds tactile satisfaction
- **Item lifespan**: All items persist on board until merged or sold (no decay)

### 4.2 Board

- **Single shared 7x9 grid** (63 cells)
- All chains coexist on one board
- Board expansion unlocked at player level 10 (+1 row) and level 25 (+1 row)
- **Storage**: 10-slot off-board inventory unlocked at level 5 for parking items

### 4.3 Generators

- **3 generators at MVP**: Sakura Bud (tree), Rice Sack (cart), Paper Scrap (lantern)
- Each generator: tap to spend energy, spawns 1–3 random low-tier items from its chain
- **Generator levels**: Each generator can itself be merged/upgraded (it IS the bottom of its chain) — higher-tier generators spawn higher-tier items and have larger spawn pools
- **Recharge generators**: Some generators (Sakura Tree) need a 30s rest after 5 taps — replaced by tapping a secondary generator, never blocks play

### 4.4 Energy

- **Soft-cap design**: Max 120, regen +1 per 45 seconds (full refill in 90 min)
- Energy spent only on generator taps (~1–2 per useful action)
- A 5-minute session burns ~40–80 energy → idle player refills to full between sessions
- **Overflow**: Energy can exceed cap via rewards (up to 200 ceiling), incentivizing daily login
- **No energy popups** when player runs out — just a soft tooltip; player can still merge existing board items

### 4.5 Quests & Orders

- **Active quest panel**: 3 slots, refresh every 20 min or via rewarded ad
- **Quest types**:
  - **Deliver**: Bring tier N item to a villager (most common, 70%)
  - **Restore**: Place merged item into a building socket (30%)
  - **Story quests**: Hand-authored, tied to narrative beats
- **Rewards**: Coins, XP, occasional gems, energy, decoration tokens

---

## 5. Item Chain Economy (MVP)

### 5.1 Sakura Chain (nature / decoration)

| Tier | Item | Source |
|------|------|--------|
| 1 | Sakura Bud | Sakura Tree (generator) |
| 2 | Pink Petal | merge |
| 3 | Blooming Branch | merge |
| 4 | Sakura Bonsai | merge |
| 5 | Young Sakura Tree | merge |
| 6 | Full Sakura Bloom | merge |
| 7 | Eternal Sakura Spirit | merge — final reward item |

### 5.2 Sushi Chain (food / villager favors)

| Tier | Item | Source |
|------|------|--------|
| 1 | Rice Grain | Rice Sack (generator) |
| 2 | Onigiri | merge |
| 3 | Maki Roll | merge |
| 4 | Nigiri Pair | merge |
| 5 | Sushi Platter | merge |
| 6 | Bento Box | merge |
| 7 | Imperial Feast | merge — final reward item |

### 5.3 Lantern Chain (light / shrine restoration)

| Tier | Item | Source |
|------|------|--------|
| 1 | Paper Scrap | Paper Pile (generator) |
| 2 | Folded Paper | merge |
| 3 | Painted Paper | merge |
| 4 | Small Lantern | merge |
| 5 | Lit Lantern | merge |
| 6 | Floating Lantern | merge |
| 7 | Spirit Lantern | merge — final reward item |

### 5.4 Cross-Chain Items (mid-game)

- **Picnic Basket** (requires Tier 4 Sushi + Tier 3 Sakura) — for Hanami quest line
- **Festival Stand** (requires Tier 5 Lantern + Tier 4 Sushi) — for Hanami event

---

## 6. Base Building — The Hidden Village

### 6.1 Hub World

- Separate scrollable village view (button to swap from merge board)
- **Camera**: Pan across painted village; tap buildings/NPCs for dialogue
- **Day/night cycle**: 12-min real-time cycle for ambient charm (no gameplay impact)
- **Weather**: Light falling petals, rain, fireflies at night — purely visual

### 6.2 MVP Zone — Spirit Village Entry

- **Restoration steps** (8 total, unlocked sequentially):
  1. Clear the path to the Torii Gate (50 coins + Tier 3 Sakura)
  2. Paint the Torii Gate red (200 coins + Tier 4 Sakura)
  3. Light the first stone lantern (150 coins + Tier 4 Lantern)
  4. Repair the Miko's shrine (300 coins + Tier 5 Sushi offering)
  5. Restore the sakura grove (500 coins + Tier 5 Sakura)
  6. Hang festival lanterns (400 coins + 2x Tier 5 Lantern)
  7. Open the tea house (700 coins + Tier 6 Sushi)
  8. Awaken the Spirit Tree (1000 coins + Tier 7 Sakura) — **MVP credits roll**

- **Decorations**: 6 optional cosmetic placements (stone path styles, lantern colors) — bought with decoration tokens (free) or premium variants (gems)

### 6.3 Visual Reward Loop

- Every restoration step plays a 3-second "transformation" animation with sparkle SFX
- Hana reacts in dialogue: surprise, joy, awe
- Screenshot/share button appears after each step (organic UA)

---

## 7. Meta-Progression

### 7.1 Player Level (XP)

- 30 levels at MVP (gated by content)
- Level rewards: energy cap +5 every 3 levels, gem grants every 5 levels, decoration unlocks, board expansion at L10/L25

### 7.2 Collections (Album)

- **Spirit Album**: Sticker book filled by reaching max tier of each chain
- 3 stickers at MVP (one per chain) + 6 bonus stickers from event/quest milestones
- Album completion grants a unique cosmetic (Golden Torii decoration)

### 7.3 Daily Engagement

- **Daily blessing**: 7-day rotating login calendar (Day 7 = premium gem grant)
- **Daily quests**: 3 light tasks (merge 20 items, complete 3 deliveries, restore 1 step)
- **Hana's daily gift**: Free chest after first session of the day (rewarded ad doubles it)

### 7.4 Live Events (MVP launches with one)

- **Hanami Festival** (14-day rotating event):
  - Side board with cherry-blossom-themed exclusive chain
  - Event currency (Petal Coins) earned by event quests
  - Event shop with 3 cosmetic rewards
  - Top milestone reward: animated Sakura Spirit decoration

---

## 8. Narrative

### 8.1 Setup

- Player character (customizable: name, light avatar) finds an old, weathered letter from their grandmother
- The letter speaks of a hidden village she visited as a child, accessible only through a torii gate hidden in the Mt. Fuji foothills
- Player journeys to the location, finds the gate overgrown, steps through — emerges into a faded, abandoned spirit village
- Hana the Miko greets them: "You came! The village has been waiting..."

### 8.2 Hana (Miko Companion)

- **Role**: Tutorial guide, quest giver, narrator, emotional anchor
- **Personality**: Earnest, kind, occasionally clumsy; hides quiet sadness about the village's decline
- **Reveal arc**: Hana herself is a spirit who has stayed to wait for someone — her own grandmother's apprentice
- **Visual**: Traditional miko attire (white haori, red hakama), short black hair with a sakura hairpin, gentle smile

### 8.3 Story Beats (MVP — ~10 chapters)

1. **Arrival** — Step through the gate, meet Hana
2. **The Forgotten Path** — Clear the way, learn merging
3. **First Bloom** — Restore the first sakura, unlock the Sushi chain
4. **The Shopkeeper** — Meet Goro (tanuki innkeeper, comic relief)
5. **Lanterns in the Mist** — Unlock the Lantern chain, light the stone path
6. **A Quiet Tea** — Repair the tea house, learn village history
7. **The Empty Shrine** — Restore the shrine, Hana's hint at her past
8. **Festival Memories** — Hanami event kickoff
9. **The Spirit's Wish** — Hana's reveal scene
10. **The Tree Awakens** — Final restoration, credits + teaser for Zone 2

### 8.4 Supporting Cast (MVP)

- **Goro** — Tanuki innkeeper, runs the tea house, comic relief, loves sushi
- **Yuki** — Mute snow-spirit child who appears at night, gives hints
- **Old Crane** — Wise NPC who explains lore in short vignettes

---

## 9. UI / UX Flow

### 9.1 Main Screens

- **Splash → Daily Blessing → Merge Board** (default home)
- **Top bar**: Coins / Gems / Energy / Player Level
- **Bottom nav**: Board · Village · Quests · Album · Shop
- **Side panel** (board): Active quests, current event, generators dock

### 9.2 First-Time User Experience (FTUE)

- **Minute 1**: Animated intro (gate, Hana), one tap-to-merge tutorial
- **Minute 2**: Spawn from generator, merge to Tier 3, get first reward
- **Minute 3**: First quest delivery, see coins earned
- **Minute 4**: Tap village button, see first restoration step, complete it
- **Minute 5**: Hana introduces daily blessing — close-of-session beat
- **D1 hook**: Push notif "Hana left you a gift at the shrine" + 1 energy refill grant

### 9.3 Accessibility

- Large tap targets (kid-friendly)
- Color-blind safe palette (sakura pink paired with deep purple, not red)
- Optional text size scaling
- Optional reduced-motion mode for restoration animations

---

## 10. Art & Audio Direction

### 10.1 Art

- **Style**: Hand-painted watercolor textures with soft cel-shading, anime-influenced character art
- **Palette**: Warm pinks, soft creams, deep indigo nights, lantern gold accents
- **References**: Studio Ghibli backgrounds, *Spiritfarer* warmth, *Cozy Grove* charm
- **Asset scope at MVP**: ~80 unique merge items, ~25 village props, 4 character portraits, 1 hub world

### 10.2 Audio

- **Music**: Soft shakuhachi + koto + light synth pads; 3 tracks at MVP (day, night, event)
- **SFX**: Wooden clack on merge, soft chime on level-up, wind-bell on app open, paper rustle on quest complete
- **Voice**: No full VO at MVP; Hana has localized text + occasional one-word vocalizations ("Mmm!", "Ahh!")

---

## 11. Monetization (Soft / Family-Friendly)

### 11.1 Storefront

- **Hard currency**: Gems
- **Gem packs**: $0.99 / $4.99 / $9.99 / $19.99 / $49.99
- **Coin packs**: $1.99 / $4.99 (low-pressure)

### 11.2 IAP Offers (MVP)

- **Starter Bundle** ($2.99, Day 1 one-time): 200 gems + 50 energy + exclusive "Welcome Lantern" decoration
- **Hanami Bundle** ($4.99, event-only): 500 gems + Sakura Spirit decoration + 100 event currency
- **Decoration Packs** ($1.99–$6.99): 3 cosmetic-only bundles, no gameplay advantage
- **Gem Doubler** ($9.99, one-time): Permanently doubles gem purchase amount

### 11.3 Rewarded Video (target: 60% DAU watches 2+ ads/day)

- Free chest doubler (1x/day)
- Quest reward doubler (5x/day cap)
- Free energy +20 (5x/day cap)
- Free hint (when stuck on quest)
- **Hard ad cap**: 15 ads/day, never popped up unprompted

### 11.4 Explicitly Excluded (audience trust)

- No FOMO countdown popups
- No "miss out forever" mechanics outside opt-in events
- No loot box / gacha
- No third-party data ads to kids (COPPA / GDPR-K compliant; age gate at install)

### 11.5 Battle Pass — Deferred Post-MVP

- Held for post-soft-launch validation; introduce in v1.2 if retention proves out

---

## 12. KPI Targets (Soft Launch)

| Metric | Target |
|--------|--------|
| D1 retention | 45% |
| D7 retention | 22% |
| D30 retention | 9% |
| Avg session length | 5–7 min |
| Sessions/DAU | 2.5 |
| Tutorial completion | 85% |
| ARPDAU | $0.18–$0.25 |
| Payer conversion | 3.5% |
| 30-day LTV | $4.50 |
| Crash-free sessions | 99.5% |

---

## 13. Tech & Production

### 13.1 Engine & Stack

- **Engine**: Unity 2023 LTS (mature merge-game ecosystem, cross-platform)
- **Backend**: PlayFab or custom Node.js + Postgres for player state, leaderboards, events
- **Analytics**: GameAnalytics + Firebase + custom funnel events
- **Crash reporting**: Sentry

### 13.2 Team & Timeline (estimate)

- **Team**: 1 PM, 2 engineers, 1 game designer, 2 artists, 1 audio (contract), 1 QA
- **MVP timeline**: 8–10 months to soft launch (2 PH/CA markets)
- **Post-launch**: 3-month iteration window before global launch decision

### 13.3 Risk Register

- **Risk**: Anime/Japanese theme could feel inauthentic or stereotyped → **Mitigation**: Hire Japanese culture consultant, respectful art direction review
- **Risk**: Soft monetization may not hit ARPDAU targets → **Mitigation**: Tune event cadence in soft launch; battle pass ready as v1.2 lever
- **Risk**: Merge market saturation → **Mitigation**: Lean hard on thematic differentiation and audio/visual polish

---

## 14. MVP Feature List & Cut Lines

### Must-Have (MVP)

- Merge-2 core loop with 3 chains × 7 tiers
- 1 restoration zone (8 steps)
- Hana companion + 10-chapter story
- Single shared 7x9 board
- Soft-cap energy system
- Quest system (3 active slots)
- Daily login + daily quests
- Spirit Album (3 stickers)
- Hanami event (1)
- Cosmetic IAP + Starter Pack
- Rewarded video integration
- FTUE (5-minute tutorial)
- Localization: EN, JA, ZH-TW, KO, ES, DE, FR

### Nice-to-Have (cut if behind schedule)

- Day/night cycle visual
- Yuki (snow spirit) night NPC
- Album bonus stickers
- Customizable player avatar
- Friend list / gift-sending

### Post-MVP (v1.1+)

- Battle Pass (Sakura Pass)
- Zone 2: Hot Spring Village
- 2 new merge chains (Kimono, Firework)
- Yokai companion cast expansion
- Cloud save / cross-device
- Photo Mode for sharing village snapshots

---

## 15. Open Questions for Next Pass

- Exact tuning curves for coin/XP per quest tier (need economy simulation)
- Localization budget for cultural-context dialogue
- Influencer/UA strategy for soft launch markets
- Decision: in-house art vs. art outsource studio
- Legal: trademark search on "Hidden Sakura" working title
