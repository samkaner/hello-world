#!/usr/bin/env python3
"""Deterministic chiptune audio generator for Sproutlandia.

Same philosophy as tools/pixelart: pure stdlib (wave + math), no external
dependencies, byte-identical output on every run. Produces 16-bit mono WAVs
under assets/audio/: one file per sound effect plus two short music loops.

Run from the repo root (or anywhere):  python3 tools/audio/gen_audio.py
"""

import math
import os
import struct
import wave

SAMPLE_RATE = 22050
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "audio")


# ---------------------------------------------------------------------------
# Synthesis primitives
# ---------------------------------------------------------------------------

def square(phase: float) -> float:
    return 1.0 if (phase % 1.0) < 0.5 else -1.0


def triangle(phase: float) -> float:
    p = phase % 1.0
    return 4.0 * p - 1.0 if p < 0.5 else 3.0 - 4.0 * p


def saw(phase: float) -> float:
    return 2.0 * (phase % 1.0) - 1.0


def noise(state: list) -> float:
    """Deterministic LCG noise; `state` is a single-element mutable seed."""
    state[0] = (state[0] * 1103515245 + 12345) & 0x7FFFFFFF
    return (state[0] / 0x3FFFFFFF) - 1.0


def midi_to_freq(midi: int) -> float:
    return 440.0 * 2.0 ** ((midi - 69) / 12.0)


def envelope(t: float, duration: float, attack: float = 0.005, release: float = 0.05) -> float:
    """Linear attack / sustain / linear release amplitude envelope."""
    if t < attack:
        return t / attack
    if t > duration - release:
        return max(0.0, (duration - t) / release)
    return 1.0


def render(duration: float, sample_fn) -> list:
    """sample_fn(t) -> float in [-1, 1]; returns a list of samples."""
    n = int(duration * SAMPLE_RATE)
    return [sample_fn(i / SAMPLE_RATE) for i in range(n)]


def tone(duration: float, wave_fn, freq_fn, amp: float = 0.5,
         attack: float = 0.005, release: float = 0.05) -> list:
    """A single swept tone. freq_fn(t) gives instantaneous frequency."""
    samples = []
    phase = 0.0
    n = int(duration * SAMPLE_RATE)
    for i in range(n):
        t = i / SAMPLE_RATE
        phase += freq_fn(t) / SAMPLE_RATE
        samples.append(wave_fn(phase) * amp * envelope(t, duration, attack, release))
    return samples


def silence(duration: float) -> list:
    return [0.0] * int(duration * SAMPLE_RATE)


def mix(*tracks: list) -> list:
    """Sum tracks sample-wise (shorter tracks padded with silence)."""
    length = max(len(t) for t in tracks)
    out = [0.0] * length
    for track in tracks:
        for i, s in enumerate(track):
            out[i] += s
    return out


def write_wav(name: str, samples: list) -> None:
    path = os.path.join(OUT_DIR, name + ".wav")
    frames = b"".join(
        struct.pack("<h", max(-32767, min(32767, int(s * 32767)))) for s in samples
    )
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(frames)
    print(f"  {name}.wav  ({len(samples) / SAMPLE_RATE:.2f}s)")


# ---------------------------------------------------------------------------
# Sound effects
# ---------------------------------------------------------------------------

def sfx_jump() -> list:
    return tone(0.16, square, lambda t: 220 + 900 * t, amp=0.30)


def sfx_hover() -> list:
    state = [7]
    return render(0.20, lambda t: noise(state) * 0.10 * envelope(t, 0.20, 0.02, 0.1)
                  + triangle(t * 90) * 0.08 * envelope(t, 0.20, 0.02, 0.1))


def sfx_attack() -> list:
    state = [21]
    return render(0.12, lambda t: noise(state) * 0.28 * envelope(t, 0.12, 0.002, 0.08)
                  * (1.0 - t / 0.12))


def sfx_hurt() -> list:
    return tone(0.22, square, lambda t: 320 - 800 * t if 320 - 800 * t > 90 else 90,
                amp=0.28)


def sfx_stomp() -> list:
    thump = tone(0.08, triangle, lambda t: 140 - 400 * t if 140 - 400 * t > 45 else 45,
                 amp=0.42)
    pop = tone(0.10, square, lambda t: 400 + 1400 * t, amp=0.18)
    return thump + pop


def sfx_enemy_die() -> list:
    out = []
    for i, m in enumerate([76, 71, 64]):
        out += tone(0.07, square, lambda t, f=midi_to_freq(m): f, amp=0.26)
    return out


def sfx_pickup() -> list:
    a = tone(0.08, square, lambda t: midi_to_freq(84), amp=0.24)
    b = tone(0.12, square, lambda t: midi_to_freq(89), amp=0.24)
    return a + b


def sfx_checkpoint() -> list:
    out = []
    for m in [72, 76, 79, 84]:
        out += tone(0.07, triangle, lambda t, f=midi_to_freq(m): f, amp=0.32)
    return out


def sfx_level_clear() -> list:
    out = []
    for m, d in [(72, 0.12), (74, 0.12), (76, 0.12), (79, 0.12), (84, 0.4)]:
        out += tone(d, square, lambda t, f=midi_to_freq(m): f, amp=0.24, release=0.04)
    return out


def sfx_boss_roar() -> list:
    state = [99]
    return render(0.55, lambda t: saw(t * (70 - 30 * t)) * 0.30 * envelope(t, 0.55, 0.05, 0.2)
                  + noise(state) * 0.08 * envelope(t, 0.55, 0.05, 0.2))


def sfx_boss_hit() -> list:
    return tone(0.12, saw, lambda t: 180 - 400 * t if 180 - 400 * t > 60 else 60, amp=0.30)


def sfx_game_over() -> list:
    out = []
    for m, d in [(64, 0.25), (62, 0.25), (60, 0.25), (55, 0.7)]:
        out += tone(d, triangle, lambda t, f=midi_to_freq(m): f, amp=0.32, release=0.08)
    return out


def sfx_victory() -> list:
    out = []
    for m, d in [(72, 0.14), (76, 0.14), (79, 0.14), (84, 0.3), (79, 0.14), (84, 0.6)]:
        out += tone(d, square, lambda t, f=midi_to_freq(m): f, amp=0.22, release=0.05)
    return out


# ---------------------------------------------------------------------------
# Music
# ---------------------------------------------------------------------------

def sequence(notes, beat: float, wave_fn, amp: float, gap: float = 0.02) -> list:
    """notes: list of (midi_or_None, beats). Renders back-to-back."""
    out = []
    for midi, beats in notes:
        dur = beats * beat
        if midi is None:
            out += silence(dur)
        else:
            out += tone(dur - gap, wave_fn, lambda t, f=midi_to_freq(midi): f,
                        amp=amp, release=0.03) + silence(gap)
    return out


def _kick() -> list:
    """A soft chip-kick: fast pitch drop with a click of noise."""
    state = [3]
    return render(0.09, lambda t: triangle(t * (130 - 900 * t if 130 - 900 * t > 35 else 35))
                  * 0.5 * envelope(t, 0.09, 0.002, 0.05)
                  + noise(state) * 0.06 * envelope(t, 0.09, 0.001, 0.02))


def _hat(open_hat: bool = False) -> list:
    """A short noise hat; open variant rings slightly longer."""
    dur = 0.07 if open_hat else 0.03
    state = [51]
    return render(dur, lambda t: noise(state) * 0.11 * envelope(t, dur, 0.001, dur * 0.8))


def drum_track(total_beats: float, beat: float,
               kick_beats: list, hat_eighths: bool = True) -> list:
    """Kicks at the given beat offsets, closed hats on every off-eighth."""
    total = silence(total_beats * beat)
    k = _kick()
    h = _hat()
    ho = _hat(open_hat=True)

    def stamp(sound: list, at_beats: float) -> None:
        start = int(at_beats * beat * SAMPLE_RATE)
        for i, s in enumerate(sound):
            if start + i < len(total):
                total[start + i] += s

    for kb in kick_beats:
        stamp(k, kb)
    if hat_eighths:
        eighth = 0.5
        n = int(total_beats / eighth)
        for i in range(n):
            if (i % 2) == 1:
                stamp(ho if i % 8 == 7 else h, i * eighth)
    return total


def music_overworld() -> list:
    beat = 60.0 / 132.0  # cheerful stroll
    e = 0.5  # eighth note
    melody = sequence([
        (72, e), (76, e), (79, e), (76, e), (72, e), (76, e), (79, e), (81, e),
        (74, e), (77, e), (81, e), (77, e), (74, e), (77, e), (81, e), (83, e),
        (76, e), (79, e), (83, e), (79, e), (84, e), (83, e), (79, e), (76, e),
        (74, e), (77, e), (81, e), (77, e), (79, 1.0), (72, 1.0),
        (72, e), (76, e), (79, e), (76, e), (72, e), (76, e), (79, e), (81, e),
        (74, e), (77, e), (81, e), (77, e), (74, e), (77, e), (81, e), (83, e),
        (84, e), (83, e), (81, e), (79, e), (77, e), (76, e), (74, e), (72, e),
        (74, e), (71, e), (74, e), (77, e), (72, 2.0),
    ], beat, square, amp=0.14)
    bass = sequence([
        (48, 1.0), (55, 1.0), (48, 1.0), (55, 1.0),
        (50, 1.0), (57, 1.0), (50, 1.0), (57, 1.0),
        (52, 1.0), (59, 1.0), (52, 1.0), (59, 1.0),
        (50, 1.0), (57, 1.0), (55, 1.0), (55, 1.0),
        (48, 1.0), (55, 1.0), (48, 1.0), (55, 1.0),
        (50, 1.0), (57, 1.0), (50, 1.0), (57, 1.0),
        (53, 1.0), (60, 1.0), (52, 1.0), (59, 1.0),
        (50, 1.0), (55, 1.0), (48, 2.0),
    ], beat, triangle, amp=0.18)
    drums = drum_track(32.0, beat, [b for b in range(0, 32, 2)])
    return mix(melody, bass, drums)


def music_boss() -> list:
    beat = 60.0 / 150.0  # urgent
    e = 0.5
    # A section: prowling. B section: the same idea a fourth up, answered
    # by a falling run -- keeps the loop from wearing out its welcome.
    melody = sequence([
        (69, e), (None, e), (69, e), (72, e), (69, e), (None, e), (76, e), (75, e),
        (69, e), (None, e), (69, e), (72, e), (74, e), (72, e), (69, e), (67, e),
        (65, e), (None, e), (65, e), (69, e), (65, e), (None, e), (72, e), (71, e),
        (67, e), (67, e), (71, e), (74, e), (76, 1.0), (75, 1.0),
        (74, e), (None, e), (74, e), (77, e), (74, e), (None, e), (81, e), (80, e),
        (74, e), (None, e), (74, e), (77, e), (79, e), (77, e), (74, e), (72, e),
        (81, e), (79, e), (77, e), (76, e), (74, e), (72, e), (71, e), (69, e),
        (67, e), (69, e), (71, e), (72, e), (69, 1.0), (68, 1.0),
    ], beat, square, amp=0.14)
    harmony = sequence([
        (None, 17.0),  # silent through the A section
        (57, 2.0), (None, 2.0), (57, 2.0), (None, 2.0),
        (53, 2.0), (None, 2.0), (55, 2.0), (52, 2.0),
    ], beat, triangle, amp=0.10)
    bass = sequence([
        (45, e), (45, e), (45, e), (47, e), (48, e), (48, e), (47, e), (45, e),
        (45, e), (45, e), (45, e), (47, e), (48, e), (50, e), (52, e), (48, e),
        (41, e), (41, e), (41, e), (43, e), (45, e), (45, e), (43, e), (41, e),
        (43, e), (43, e), (47, e), (47, e), (52, 1.0), (47, 1.0),
        (50, e), (50, e), (50, e), (52, e), (53, e), (53, e), (52, e), (50, e),
        (50, e), (50, e), (50, e), (52, e), (53, e), (55, e), (57, e), (53, e),
        (53, e), (53, e), (52, e), (52, e), (50, e), (50, e), (48, e), (48, e),
        (43, e), (43, e), (47, e), (47, e), (45, 1.0), (44, 1.0),
    ], beat, saw, amp=0.14)
    kicks = []
    for b in range(32):
        kicks.append(float(b))
        if b % 4 == 3:
            kicks.append(b + 0.5)  # extra push into each bar line
    drums = drum_track(32.0, beat, kicks)
    return mix(melody, harmony, bass, drums)


# ---------------------------------------------------------------------------

def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    print("Generating Sproutlandia audio:")
    write_wav("sfx_jump", sfx_jump())
    write_wav("sfx_hover", sfx_hover())
    write_wav("sfx_attack", sfx_attack())
    write_wav("sfx_hurt", sfx_hurt())
    write_wav("sfx_stomp", sfx_stomp())
    write_wav("sfx_enemy_die", sfx_enemy_die())
    write_wav("sfx_pickup", sfx_pickup())
    write_wav("sfx_checkpoint", sfx_checkpoint())
    write_wav("sfx_level_clear", sfx_level_clear())
    write_wav("sfx_boss_roar", sfx_boss_roar())
    write_wav("sfx_boss_hit", sfx_boss_hit())
    write_wav("sfx_game_over", sfx_game_over())
    write_wav("sfx_victory", sfx_victory())
    write_wav("music_overworld", music_overworld())
    write_wav("music_boss", music_boss())
    print("Done.")


if __name__ == "__main__":
    main()
