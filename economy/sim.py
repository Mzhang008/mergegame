"""
Sakura Merge - Economy Simulator (v0.1)

Models a casual cozy persona (2.5 sessions/day, 5 min each, 30 days) to
validate the MVP economy: does the player finish the 8-step restoration
in the target window, hit level 12-18, and keep a healthy coin balance?

Tweak economy/params.json and re-run.

Outputs:
  economy/output/day_curve.csv         - per-day progression snapshot
  economy/output/chain_inventory.csv   - final per-tier inventory by chain
  economy/output/summary.txt           - validation verdicts
"""

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARAMS_PATH = ROOT / "params.json"
OUT = ROOT / "output"
OUT.mkdir(exist_ok=True)


def xp_for_next_level(level, base, exp):
    return int(base * (level ** exp))


def level_from_xp(xp_total, base, exp, max_level=30):
    level = 1
    cumulative = 0
    while level < max_level:
        cost = xp_for_next_level(level, base, exp)
        if cumulative + cost > xp_total:
            return level
        cumulative += cost
        level += 1
    return level


def quest_tier_mix(day, schedule):
    for entry in schedule:
        if day <= entry["until_day"]:
            return entry["mix"]
    return schedule[-1]["mix"]


def simulate(params):
    sim = params["sim"]
    days = sim["days"]
    sessions_per_day = sim["sessions_per_day"]
    energy_per_session = sim["energy_per_session_avg"]
    items_per_energy = sim["items_per_energy"]
    promote_ratios = sim["merge_promote_ratios"]

    chains = list(params["chains"])
    chain_inventory = {c: {t: 0.0 for t in range(1, 8)} for c in chains}

    quests_per_session = params["quests"]["completed_per_session_avg"]
    quest_rewards = {int(k): v for k, v in params["quests"]["rewards_by_tier"].items()}
    tier_schedule = params["quests"]["tier_mix_schedule"]

    restoration_steps = params["restoration"]["steps"]
    xp_base = params["progression"]["xp_curve_base"]
    xp_exp = params["progression"]["xp_curve_exponent"]

    coins = 0.0
    xp_total = 0.0
    restoration_step = 0
    rows = []

    for day in range(1, days + 1):
        energy_today = sessions_per_day * energy_per_session
        items_today = energy_today * items_per_energy
        items_per_chain = items_today / len(chains)

        for c in chains:
            chain_inventory[c][1] += items_per_chain

        for c in chains:
            for t in range(1, 7):
                pairs = chain_inventory[c][t] / 2
                promoted = pairs * promote_ratios[t - 1]
                chain_inventory[c][t + 1] += promoted
                chain_inventory[c][t] -= promoted * 2

        quests_today = sessions_per_day * quests_per_session
        mix = quest_tier_mix(day, tier_schedule)
        coins_today = 0.0
        xp_today = 0.0
        for tier_str, weight in mix.items():
            tier = int(tier_str)
            target = quests_today * weight
            share = target / len(chains)
            for c in chains:
                delivered = min(share, chain_inventory[c][tier])
                chain_inventory[c][tier] -= delivered
                coins_today += delivered * quest_rewards[tier]["coins"]
                xp_today += delivered * quest_rewards[tier]["xp"]

        coins += coins_today
        xp_total += xp_today

        while restoration_step < len(restoration_steps):
            step = restoration_steps[restoration_step]
            qty = step.get("qty", 1)
            inv = chain_inventory[step["item_chain"]][step["item_tier"]]
            if coins >= step["coins"] and inv >= qty:
                coins -= step["coins"]
                chain_inventory[step["item_chain"]][step["item_tier"]] -= qty
                restoration_step += 1
            else:
                break

        level = level_from_xp(xp_total, xp_base, xp_exp)

        rows.append({
            "day": day,
            "energy_spent": round(energy_today),
            "items_spawned": round(items_today),
            "quests_done": round(quests_today, 1),
            "coins_earned": round(coins_today),
            "coins_balance": round(coins),
            "xp_earned": round(xp_today),
            "xp_total": round(xp_total),
            "level": level,
            "restoration_step": restoration_step,
            "sakura_t3": round(chain_inventory["sakura"][3], 1),
            "sakura_t5": round(chain_inventory["sakura"][5], 1),
            "sakura_t7": round(chain_inventory["sakura"][7], 2),
            "sushi_t5": round(chain_inventory["sushi"][5], 1),
            "sushi_t6": round(chain_inventory["sushi"][6], 1),
            "lantern_t5": round(chain_inventory["lantern"][5], 1),
        })

    return rows, chain_inventory, restoration_step


def write_outputs(rows, chain_inventory, restoration_step, params):
    with open(OUT / "day_curve.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    with open(OUT / "chain_inventory.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["chain", "tier", "count"])
        for c, tiers in chain_inventory.items():
            for t, n in tiers.items():
                w.writerow([c, t, round(n, 2)])

    final = rows[-1]
    days = params["sim"]["days"]
    lines = [
        "Sakura Merge - Economy Simulation Summary (v0.1)",
        "=" * 52,
        f"Sim window:     {days} days",
        f"Sessions/day:   {params['sim']['sessions_per_day']}",
        f"Energy/session: {params['sim']['energy_per_session_avg']}",
        f"Quests/session: {params['quests']['completed_per_session_avg']}",
        "",
        "--- Player state at D30 ---",
        f"  Level:            {final['level']} / 30",
        f"  XP total:         {final['xp_total']:,}",
        f"  Coin balance:     {final['coins_balance']:,}",
        f"  Restoration step: {restoration_step} / 8",
        "",
        "--- Validation verdicts ---",
    ]

    days_to_mvp = next((r["day"] for r in rows if r["restoration_step"] == 8), None)
    if days_to_mvp:
        if 21 <= days_to_mvp <= 30:
            lines.append(f"  [PASS] MVP completed on day {days_to_mvp} (target 21-30)")
        elif days_to_mvp < 21:
            lines.append(f"  [TUNE] MVP completed on day {days_to_mvp} - too fast; raise costs or item requirements")
        else:
            lines.append(f"  [TUNE] MVP completed on day {days_to_mvp} - too slow; lower costs or boost rewards")
    else:
        lines.append(f"  [FAIL] MVP not completed in {days} days (reached {restoration_step}/8)")

    if 12 <= final["level"] <= 18:
        lines.append(f"  [PASS] Level {final['level']} at D30 (target 12-18)")
    else:
        verdict = "too low - boost XP rewards" if final["level"] < 12 else "too high - flatten rewards or steepen curve"
        lines.append(f"  [TUNE] Level {final['level']} at D30 - {verdict}")

    coin_bal = final["coins_balance"]
    if 1000 <= coin_bal <= 8000:
        lines.append(f"  [PASS] Coin balance {coin_bal:,} (target 1k-8k buffer)")
    elif coin_bal < 1000:
        lines.append(f"  [TUNE] Coin balance {coin_bal:,} - too tight; may starve cosmetic purchases")
    else:
        lines.append(f"  [TUNE] Coin balance {coin_bal:,} - too generous; raise restoration costs or cut quest payouts")

    text = "\n".join(lines)
    (OUT / "summary.txt").write_text(text + "\n")
    print(text)


if __name__ == "__main__":
    params = json.loads(PARAMS_PATH.read_text())
    rows, inv, step = simulate(params)
    write_outputs(rows, inv, step, params)
