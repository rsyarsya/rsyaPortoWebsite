# ascii-sharks

Source: https://github.com/stackedlol/ascii-sharks
Revision: a0074c16a106f0abc665fe9712ca445f8f98ad8e
License: MIT, copyright (c) 2026 drewdi. See LICENSE; public copy at /licenses/ascii-sharks.txt.

Vendored world, renderer, species and math modules. No runtime dependencies.
Local renderer adaptations: alpha-enabled canvas, transparent background without
the demo grid, and clear the bitmap before each render (no black backdrop).
Small fish use a directional, multi-character body and animated tail at their
continuous simulation position instead of the upstream single-cell dash.
The adapter uses 32 fish per margin with wider school spacing.
The portfolio uses World + AsciiRenderer directly with its own scheduler in
src/scripts/ascii-background.ts to respect motion preferences, scene budget,
hidden tabs and margin-only rendering. The upstream engine's global pointer
handlers are deliberately not mounted for this decorative layer.
