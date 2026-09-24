"""Build a deterministic synthetic teaching connectome for offline gameplay.

All DEMO_ labels and counts are generated here and must never be presented as
FlyWire observations. A real-data build can replace web/data/circuit.json.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "data" / "circuit.json"
GROUPS = [
    ("olfactory_L", "Smell · left", "olfactory", "L"),
    ("olfactory_R", "Smell · right", "olfactory", "R"),
    ("visual_L", "Vision · left", "visual", "L"),
    ("visual_R", "Vision · right", "visual", "R"),
    ("mechanosensory_L", "Touch · left", "mechanosensory", "L"),
    ("mechanosensory_R", "Touch · right", "mechanosensory", "R"),
    ("gustatory_L", "Taste · left", "gustatory", "L"),
    ("gustatory_R", "Taste · right", "gustatory", "R"),
]
LAYERS = [192, 300, 330, 330, 330, 318]
N = sum(LAYERS)
state = 0x4E42544


def rand(limit):
    global state
    state = (state + 0x6D2B79F5) & 0xFFFFFFFF
    value = state
    value = ((value ^ (value >> 15)) * (value | 1)) & 0xFFFFFFFF
    value ^= value + (((value ^ (value >> 7)) * (value | 61)) & 0xFFFFFFFF)
    value &= 0xFFFFFFFF
    value ^= value >> 14
    return value % limit


neurons = {key: [] for key in ("id", "cellType", "cls", "superClass", "side", "sign", "x", "y", "inDeg", "outDeg")}
groups = {}
layer_starts = []
cursor = 0
for layer, size in enumerate(LAYERS):
    layer_starts.append(cursor)
    for local in range(size):
        i = cursor + local
        if layer == 0:
            group_index = local // 24
            gid, label, modality, side = GROUPS[group_index]
            cell_type = f"DEMO_{modality.upper()}_RECEPTOR_{local % 24 + 1:02d}"
            super_class = "sensory"
            cls = modality
            sign = -1 if local % 5 == 0 else 1
        else:
            side = "L" if (local % 2 == 0) else "R"
            gid = ""
            cls = ["projection", "interneuron", "descending", "motor", "local"][layer - 1]
            super_class = "central"
            cell_type = f"DEMO_{cls.upper()}_{local % 60 + 1:02d}"
            sign = -1 if (local * 7 + layer * 3) % 5 == 0 else 1
        neurons["id"].append(f"DEMO_{i:05d}")
        neurons["cellType"].append(cell_type)
        neurons["cls"].append(cls)
        neurons["superClass"].append(super_class)
        neurons["side"].append(side)
        neurons["sign"].append(sign)
        neurons["x"].append(round(layer / (len(LAYERS) - 1), 5))
        neurons["y"].append(round((local + 0.5) / size, 5))
        neurons["inDeg"].append(0)
        neurons["outDeg"].append(0)
    if layer == 0:
        for group_index, (gid, label, modality, side) in enumerate(GROUPS):
            groups[gid] = {"label": label, "modality": modality, "side": side, "neurons": list(range(group_index * 24, group_index * 24 + 24))}
    cursor += size

pairs = {}
for layer in range(1, len(LAYERS)):
    previous, current = layer_starts[layer - 1], layer_starts[layer]
    previous_size, current_size = LAYERS[layer - 1], LAYERS[layer]
    indegree = 5 if layer == 1 else 4
    for local in range(current_size):
        post = current + local
        picked = set()
        while len(picked) < indegree:
            picked.add(previous + rand(previous_size))
        for pre in picked:
            pairs[(pre, post)] = 7 + rand(13)
    # Sparse deterministic skip and lateral connections add distinct echoes.
    if layer > 1:
        for local in range(0, current_size, 3):
            pre = layer_starts[layer - 2] + (local * 11 + layer * 17) % LAYERS[layer - 2]
            pairs[(pre, current + local)] = 6 + rand(9)

edges = {"pre": [], "post": [], "syn": []}
for (pre, post), weight in sorted(pairs.items()):
    edges["pre"].append(pre)
    edges["post"].append(post)
    edges["syn"].append(weight)
    neurons["outDeg"][pre] += 1
    neurons["inDeg"][post] += 1

data = {
    "meta": {
        "source": "synthetic-demo",
        "dataset": "Neuron Beat deterministic synthetic teaching network v1",
        "generatedAt": "deterministic build",
        "counts": {
            "neurons": N,
            "edges": len(edges["pre"]),
            "seeds": LAYERS[0],
            "unknownNt": 0,
            "inhibitory": sum(value < 0 for value in neurons["sign"]),
        },
        "minSyn": 5,
    },
    "neurons": neurons,
    "edges": edges,
    "groups": groups,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
print(f"Built explicitly synthetic demo: {N} neurons, {len(edges['pre'])} edges, {len(groups)} stimulus groups")
