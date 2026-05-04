import math

HAND_LIMBS = ["right_hand", "left_hand"]
FOOT_LIMBS = ["right_foot", "left_foot"]


def _hold_type(r):
    if r < 0.025: return "crimp"
    if r < 0.045: return "sloper"
    return "jug"


def _dist(a, b):
    return math.sqrt((a["x"] - b["x"]) ** 2 + (a["y"] - b["y"]) ** 2)


def _adaptive_reach(holds):
    if len(holds) < 2:
        return 0.20
    nn = []
    for h in holds:
        others = [o for o in holds if o["id"] != h["id"]]
        if others:
            nn.append(min(_dist(h, o) for o in others))
    if not nn:
        return 0.20
    nn.sort()
    return max(0.10, min(nn[len(nn) // 2] * 2.5, 0.55))


def _sequence_cost(ids, hold_map, down_penalty=6.0):
    total = 0.0
    for i in range(len(ids) - 1):
        a, b = hold_map[ids[i]], hold_map[ids[i + 1]]
        d = _dist(a, b)
        if b["y"] > a["y"]:           # going down costs extra
            d += (b["y"] - a["y"]) * down_penalty
        total += d
    return total


def _nearest_neighbor(start, candidates):
    """Greedy nearest-neighbor with strong upward preference."""
    unvisited = list(candidates)
    ordered, current = [], start
    while unvisited:
        # Score: distance minus height gained (y decreases going up). Factor 5.0 strongly
        # prefers higher holds to prevent the route from going down then back up.
        nxt = min(unvisited, key=lambda h: _dist(current, h) - (current["y"] - h["y"]) * 5.0)
        ordered.append(nxt)
        unvisited.remove(nxt)
        current = nxt
    return ordered


def _two_opt(seq, hold_map, down_penalty=6.0):
    """2-opt improvement with heavy downward penalty to preserve upward flow."""
    if len(seq) < 4:
        return seq
    ids = [h["id"] for h in seq]
    best_cost = _sequence_cost(ids, hold_map, down_penalty)
    improved = True
    while improved:
        improved = False
        for i in range(1, len(ids) - 2):
            for j in range(i + 1, len(ids) - 1):
                new_ids = ids[:i] + ids[i:j + 1][::-1] + ids[j + 1:]
                c = _sequence_cost(new_ids, hold_map, down_penalty)
                if c < best_cost - 1e-9:
                    ids, best_cost, improved = new_ids, c, True
    return [hold_map[hid] for hid in ids]


def _assign_limb(hold, limb_positions, hand_turn, foot_turn, force_hand=False):
    """
    Assign the anatomically natural limb for this hold.
    Holds above the current body center go to hands; below go to feet.
    Alternates left/right within each type.
    """
    body_y = sum(p["y"] for p in limb_positions.values()) / 4

    if force_hand or hold["y"] < body_y + 0.05:
        # Upper hold → hand
        limb = HAND_LIMBS[hand_turn % 2]
        return limb, hand_turn + 1, foot_turn
    else:
        # Lower hold → foot
        limb = FOOT_LIMBS[foot_turn % 2]
        return limb, hand_turn, foot_turn + 1


def generate_route(holds, start_hold_ids=None, end_hold_id=None, nemotron_result=None):
    """
    Returns a route list for the climber animation.

    nemotron_result (optional dict from Nemotron):
      {
        "route":         [hold_id, ...],   # AI-selected subset in order
        "foot_start":    "smear"|"holds",  # how feet begin
        "foot_hold_ids": [id, ...]         # footholds when foot_start=="holds"
      }

    When nemotron_result is None, all holds are visited with nearest-neighbor + 2-opt.
    Limb assignment is positional (upper holds → hands, lower holds → feet).
    """
    if not holds:
        return []

    hold_map    = {h["id"]: h for h in holds}
    sorted_by_y = sorted(holds, key=lambda h: h["y"])   # y=0 top, y=1 bottom

    # ── Resolve start / end ──────────────────────────────────────────────────
    if start_hold_ids:
        start_hold_ids = [i for i in start_hold_ids if i in hold_map]
    if not start_hold_ids:
        start_hold_ids = [sorted_by_y[-1]["id"]]

    if end_hold_id not in hold_map:
        end_hold_id = sorted_by_y[0]["id"]

    end_hold  = hold_map[end_hold_id]
    start_set = set(start_hold_ids)
    reach     = _adaptive_reach(holds)

    # ── Determine middle hold sequence ───────────────────────────────────────
    foot_start    = "smear"
    foot_hold_ids = []

    if nemotron_result:
        foot_start    = nemotron_result.get("foot_start", "smear")
        foot_hold_ids = [fid for fid in nemotron_result.get("foot_hold_ids", []) if fid in hold_map]

        ai_route  = nemotron_result.get("route", [])
        seen_middle = set()
        middle = []
        for hid in ai_route:
            if hid in hold_map and hid not in start_set and hid != end_hold_id and hid not in seen_middle:
                middle.append(hold_map[hid])
                seen_middle.add(hid)
    else:
        middle_candidates = [
            h for h in holds
            if h["id"] not in start_set and h["id"] != end_hold_id
        ]
        traversal_start = min(
            (hold_map[hid] for hid in start_hold_ids), key=lambda h: h["y"]
        )
        middle = _nearest_neighbor(traversal_start, middle_candidates)
        middle = _two_opt(middle, hold_map)

    # ── Full sequence ─────────────────────────────────────────────────────────
    sequence = [hold_map[hid] for hid in start_hold_ids[:2]] + middle + [end_hold]

    # ── Build route ───────────────────────────────────────────────────────────
    route = []

    # Pre-route foot setup
    first_start = hold_map[start_hold_ids[0]]

    if foot_start == "holds" and len(foot_hold_ids) >= 2:
        for limb, hid in zip(["right_foot", "left_foot"], foot_hold_ids[:2]):
            fh = hold_map[hid]
            route.append({
                **fh,
                "limb":        limb,
                "move_number": len(route) + 1,
                "difficulty":  "setup",
                "type":        "foothold",
            })
    elif foot_start == "holds" and len(foot_hold_ids) == 1:
        fh = hold_map[foot_hold_ids[0]]
        route.append({
            **fh,
            "limb":        "right_foot",
            "move_number": 1,
            "difficulty":  "setup",
            "type":        "foothold",
        })
        smear_x = max(0.0, min(1.0, first_start["x"] + 0.045))
        smear_y = min(1.0, first_start["y"] + 0.14)
        route.append({
            "id":          "left_foot_setup",
            "x":           smear_x,
            "y":           smear_y,
            "r":           0.015,
            "color":       "setup",
            "limb":        "left_foot",
            "move_number": 2,
            "difficulty":  "setup",
            "type":        "foothold",
        })
    else:
        foot_y      = min(1.0, first_start["y"] + 0.14)
        foot_spread = 0.045
        for limb, dx in [("right_foot", -foot_spread), ("left_foot", foot_spread)]:
            route.append({
                "id":          f"{limb}_setup",
                "x":           max(0.0, min(1.0, first_start["x"] + dx)),
                "y":           foot_y,
                "r":           0.015,
                "color":       "setup",
                "limb":        limb,
                "move_number": len(route) + 1,
                "difficulty":  "setup",
                "type":        "foothold",
            })

    # Hand start holds
    for i, hid in enumerate(start_hold_ids[:2]):
        h = hold_map[hid]
        route.append({
            **h,
            "limb":        ["right_hand", "left_hand"][i],
            "move_number": len(route) + 1,
            "difficulty":  "start",
            "type":        _hold_type(h.get("r", 0.02)),
        })

    # ── Limb positions for anatomical assignment ─────────────────────────────
    limb_positions = {}
    for move in route:
        limb_positions[move["limb"]] = {"x": move["x"], "y": move["y"]}

    # Ensure all 4 limbs have initial positions (fill any missing with first_start)
    for limb in ["right_hand", "left_hand", "right_foot", "left_foot"]:
        if limb not in limb_positions:
            limb_positions[limb] = {"x": first_start["x"], "y": first_start["y"]}

    # hand_turn starts at 0 for right_hand — but both start holds already used both hands,
    # so next hand move should be right_hand again (turn 0 → right, 1 → left cycling)
    hand_turn = 0
    foot_turn = 0

    prev = hold_map[start_hold_ids[0]]
    for h in sequence[len(start_hold_ids):]:
        d = _dist(prev, h)
        if h["id"] == end_hold_id:
            difficulty = "top"
        elif d > reach * 0.8:
            difficulty = "hard"
        elif d > reach * 0.5:
            difficulty = "moderate"
        else:
            difficulty = "easy"

        limb, hand_turn, foot_turn = _assign_limb(
            h, limb_positions, hand_turn, foot_turn,
            force_hand=(h["id"] == end_hold_id)
        )

        route.append({
            **h,
            "limb":        limb,
            "move_number": len(route) + 1,
            "difficulty":  difficulty,
            "type":        _hold_type(h.get("r", 0.02)),
        })

        limb_positions[limb] = {"x": h["x"], "y": h["y"]}
        prev = h

    # ── Match move: second hand joins the end hold ────────────────────────────
    if route and route[-1]["id"] == end_hold_id:
        last_limb  = route[-1]["limb"]
        match_limb = "left_hand" if last_limb == "right_hand" else "right_hand"
        route.append({
            **end_hold,
            "limb":        match_limb,
            "move_number": len(route) + 1,
            "difficulty":  "top",
            "type":        _hold_type(end_hold.get("r", 0.02)),
        })

    return route
