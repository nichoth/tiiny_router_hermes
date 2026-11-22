# 03: Replace Ornith-1.0-35B with Ornith-1.5-35B-A3B-Turbo

**What to build:** The routing backend's `code` tier offers
`ornith-ai/Ornith-1.5-35B-A3B-Turbo` where it offered
`deepreinforce-ai/Ornith-1.0-35B`, in the same position (the first
fallback after `Qwen/Qwen3.6-35B-A3B`). The tier entry changes model id
(including the org prefix), NPU share and context:
`("ornith-ai/Ornith-1.5-35B-A3B-Turbo", 54, 262144)`, values taken from
the device catalogue. Reasoning behaviour is the same as 1.0 (always on,
not toggleable), so `thinking.py` needs no per-model change; confirm
that holds.

Every other mention of `Ornith-1.0-35B` in the package is replaced to
match: the `tiiny` provider `models:` block in the backend reference
(context_length 262144, which the config step in 08 reads), the tier
tables in `SKILL.md` and the backend reference, and the moved long-form
docs in `docs/`, where the model description is rewritten for 1.5 (a
mixture-of-experts model, about 3B active of 35B, built for repository
scale coding and agentic work) rather than the 1.0 text. In the two-box
capability matrix, which lists models that exist on the device and
already lists 1.5, drop the 1.0 entry instead of duplicating 1.5.

**Blocked by:** 02

**Touches:** `tiers.py` (`TIER_CHOICES["code"]`), `thinking.py` (verify
only), `SKILL.md`, `references/backend.md`,
`references/two-box-capability-matrix.md`, `docs/README.md`,
`docs/PATTERN.md`, `docs/IMPLEMENTATION.md`

**Status:** done

- [x] `route_check.py` reports `ornith-ai/Ornith-1.5-35B-A3B-Turbo` as a
      `code` tier candidate with 54% NPU and a 262144 context
- [x] `route_check.py` never reports `deepreinforce-ai/Ornith-1.0-35B`
- [x] The `code` tier's default model is unchanged
      (`Qwen/Qwen3.6-35B-A3B`)
- [x] No file in the package mentions `Ornith-1.0-35B`
