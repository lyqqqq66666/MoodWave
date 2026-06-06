#!/usr/bin/env python3

from __future__ import annotations

import math
import random
import struct
import wave
from array import array
from pathlib import Path


SAMPLE_RATE = 12000
MASTER_GAIN = 0.72
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "frontend" / "public" / "audio" / "music-room"


TRACKS = [
    {"id": "happy-2", "title": "阳光小跳步", "slug": "happy-yangguang-xiaotiaobu", "mood": "happy", "duration": 96, "bpm": 112, "seed": 1027},
    {"id": "happy-3", "title": "午后汽水", "slug": "happy-wuhou-qishui", "mood": "happy", "duration": 112, "bpm": 106, "seed": 1039},
    {"id": "calm-2", "title": "云朵慢步", "slug": "calm-yunduo-manbu", "mood": "calm", "duration": 118, "bpm": 70, "seed": 2021},
    {"id": "calm-3", "title": "浅海呼吸", "slug": "calm-qianhai-huxi", "mood": "calm", "duration": 132, "bpm": 68, "seed": 2033},
    {"id": "anxious-2", "title": "把线团松开", "slug": "anxious-baxiantuan-songkai", "mood": "anxious", "duration": 114, "bpm": 88, "seed": 3029},
    {"id": "anxious-3", "title": "慢慢数到十", "slug": "anxious-manmanshudao-shi", "mood": "anxious", "duration": 120, "bpm": 86, "seed": 3041},
    {"id": "angry-2", "title": "柔软边界", "slug": "angry-rouruan-bianjie", "mood": "angry", "duration": 98, "bpm": 82, "seed": 4027},
    {"id": "angry-3", "title": "暖风出口", "slug": "angry-nuanfeng-chukou", "mood": "angry", "duration": 110, "bpm": 80, "seed": 4043},
    {"id": "sad-2", "title": "雨后的小灯", "slug": "sad-yuhou-dexiaodeng", "mood": "sad", "duration": 124, "bpm": 60, "seed": 5023},
    {"id": "sad-3", "title": "慢慢浮上来", "slug": "sad-manman-fushanglai", "mood": "sad", "duration": 138, "bpm": 62, "seed": 5039},
    {"id": "neutral-2", "title": "白纸和清茶", "slug": "neutral-baizhi-heqingcha", "mood": "neutral", "duration": 102, "bpm": 74, "seed": 6029},
    {"id": "neutral-3", "title": "安静路过", "slug": "neutral-anjing-luguo", "mood": "neutral", "duration": 114, "bpm": 78, "seed": 6041},
]


SCALES = {
    "happy": ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5"],
    "calm": ["D4", "F#4", "A4", "B4", "C#5", "E5", "F#5"],
    "anxious": ["A3", "C4", "D4", "E4", "G4", "A4", "C5"],
    "angry": ["E3", "G3", "A3", "B3", "D4", "E4", "G4"],
    "sad": ["F3", "A3", "C4", "D4", "E4", "G4", "A4"],
    "neutral": ["G3", "A3", "B3", "D4", "E4", "G4", "A4"],
}


CHORDS = {
    "happy": [["C4", "E4", "G4", "B4"], ["A3", "C4", "E4", "G4"], ["F3", "A3", "C4", "E4"], ["G3", "B3", "D4", "F4"]],
    "calm": [["D3", "A3", "C#4", "F#4"], ["B2", "F#3", "A3", "D4"], ["G3", "B3", "D4", "F#4"], ["A3", "C#4", "E4", "G4"]],
    "anxious": [["A3", "C4", "E4", "G4"], ["F3", "A3", "C4", "E4"], ["D3", "G3", "A3", "C4"], ["E3", "G3", "B3", "D4"]],
    "angry": [["E3", "G3", "B3", "D4"], ["D3", "F3", "A3", "C4"], ["C3", "E3", "G3", "B3"], ["A2", "D3", "E3", "G3"]],
    "sad": [["F3", "A3", "C4", "E4"], ["D3", "F3", "A3", "C4"], ["A#2", "D3", "F3", "A3"], ["C3", "E3", "G3", "A#3"]],
    "neutral": [["G3", "B3", "D4", "A4"], ["E3", "G3", "B3", "D4"], ["C3", "E3", "G3", "B3"], ["D3", "F3", "A3", "C4"]],
}


MOOD_STYLE = {
    "happy": {"pad": "triangle", "lead": "sine", "bass": "sine", "sparkle": 0.42, "pulse": 0.35, "echo": 0.18},
    "calm": {"pad": "sine", "lead": "triangle", "bass": "sine", "sparkle": 0.14, "pulse": 0.0, "echo": 0.24},
    "anxious": {"pad": "triangle", "lead": "sine", "bass": "triangle", "sparkle": 0.12, "pulse": 0.16, "echo": 0.21},
    "angry": {"pad": "square", "lead": "triangle", "bass": "sine", "sparkle": 0.08, "pulse": 0.22, "echo": 0.16},
    "sad": {"pad": "sine", "lead": "sine", "bass": "sine", "sparkle": 0.05, "pulse": 0.0, "echo": 0.28},
    "neutral": {"pad": "triangle", "lead": "sine", "bass": "sine", "sparkle": 0.09, "pulse": 0.08, "echo": 0.18},
}


def note_to_freq(note: str) -> float:
    names = {
        "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
        "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11,
    }
    pitch = note[:-1]
    octave = int(note[-1])
    midi = 12 * (octave + 1) + names[pitch]
    return 440.0 * (2 ** ((midi - 69) / 12))


def oscillator(shape: str, phase: float) -> float:
    x = phase - math.floor(phase)
    if shape == "triangle":
        return 4 * abs(x - 0.5) - 1
    if shape == "square":
        return 1.0 if x < 0.5 else -1.0
    return math.sin(2 * math.pi * x)


def add_note(buffer: array, start: float, duration: float, freq: float, amp: float, shape: str, attack: float, release: float) -> None:
    start_index = max(0, int(start * SAMPLE_RATE))
    end_index = min(len(buffer), int((start + duration) * SAMPLE_RATE))
    length = end_index - start_index
    if length <= 4:
        return

    attack_samples = max(1, int(min(duration * 0.35, attack) * SAMPLE_RATE))
    release_samples = max(1, int(min(duration * 0.45, release) * SAMPLE_RATE))
    sustain_start = attack_samples
    sustain_end = max(sustain_start, length - release_samples)
    phase = 0.0
    phase_step = freq / SAMPLE_RATE

    for i in range(length):
        if i < attack_samples:
            env = i / attack_samples
        elif i > sustain_end:
            env = max(0.0, (length - i) / release_samples)
        else:
            env = 1.0
        if env <= 0.0:
            phase += phase_step
            continue
        buffer[start_index + i] += oscillator(shape, phase) * amp * env
        phase += phase_step


def add_noise(buffer: array, start: float, duration: float, amp: float, seed: int) -> None:
    rng = random.Random(seed)
    start_index = max(0, int(start * SAMPLE_RATE))
    end_index = min(len(buffer), int((start + duration) * SAMPLE_RATE))
    for i in range(start_index, end_index):
        progress = (i - start_index) / max(1, end_index - start_index)
        env = math.sin(progress * math.pi)
        buffer[i] += (rng.random() * 2 - 1) * amp * env


def apply_echo(buffer: array, delay_seconds: float, feedback: float) -> None:
    delay = int(delay_seconds * SAMPLE_RATE)
    if delay <= 0:
        return
    for i in range(delay, len(buffer)):
        buffer[i] += buffer[i - delay] * feedback


def normalize_to_pcm(buffer: array) -> bytes:
    peak = max(max(buffer), abs(min(buffer)), 1e-5)
    scale = (32767 * MASTER_GAIN) / peak
    pcm = bytearray()
    for sample in buffer:
        value = max(-32767, min(32767, int(sample * scale)))
        pcm.extend(struct.pack("<h", value))
    return bytes(pcm)


def write_wav(path: Path, pcm_bytes: bytes) -> None:
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        handle.writeframes(pcm_bytes)


def build_track(track: dict[str, object]) -> array:
    duration = int(track["duration"])
    bpm = int(track["bpm"])
    mood = str(track["mood"])
    seed = int(track["seed"])
    rng = random.Random(seed)
    total_samples = duration * SAMPLE_RATE
    buffer = array("f", [0.0]) * total_samples

    style = MOOD_STYLE[mood]
    scale = SCALES[mood]
    chords = CHORDS[mood]
    beats_per_bar = 4
    beat_duration = 60.0 / bpm
    bar_duration = beat_duration * beats_per_bar
    total_bars = max(8, int(duration / bar_duration))
    melody_step = 0

    for bar in range(total_bars):
        start = bar * bar_duration
        if start >= duration:
            break
        chord = chords[bar % len(chords)]
        for note in chord:
            freq = note_to_freq(note)
            add_note(buffer, start, min(bar_duration * 0.98, duration - start), freq, 0.06, style["pad"], 0.8, 1.6)

        bass_note = chord[0]
        add_note(buffer, start, min(beat_duration * 2.4, duration - start), note_to_freq(bass_note) / 2, 0.10, style["bass"], 0.03, 0.35)

        if style["pulse"] > 0:
            for beat in range(beats_per_bar):
                pulse_time = start + beat * beat_duration
                if pulse_time >= duration:
                    continue
                pulse_amp = style["pulse"] * (0.8 if beat % 2 == 0 else 0.45)
                add_note(buffer, pulse_time, min(0.18, duration - pulse_time), note_to_freq(bass_note) / 1.5, pulse_amp, "sine", 0.001, 0.12)

        subdivisions = 2 if mood in {"calm", "sad"} else 4
        step_duration = beat_duration * (beats_per_bar / subdivisions)
        for step in range(subdivisions):
            note_time = start + step * step_duration
            if note_time >= duration:
                continue
            if rng.random() < 0.18 and mood in {"calm", "sad", "neutral"}:
                continue
            mode = (seed >> 3) % 3
            if mode == 0:
                picked = chord[(melody_step + seed) % len(chord)]
            elif mode == 1:
                picked = scale[(melody_step + seed) % len(scale)]
            else:
                motif = [0, 1, -1, 2]
                anchor = scale.index(chord[0]) if chord[0] in scale else 0
                picked = scale[(anchor + motif[melody_step % len(motif)]) % len(scale)]
            freq = note_to_freq(picked) * (2 if rng.random() < 0.14 else 1)
            add_note(buffer, note_time, min(step_duration * 0.82, duration - note_time), freq, 0.07, style["lead"], 0.02, 0.24)
            if rng.random() < style["sparkle"]:
                sparkle_time = note_time + step_duration * 0.5
                if sparkle_time < duration:
                    add_note(buffer, sparkle_time, min(0.14, duration - sparkle_time), freq * 2, 0.04, "sine", 0.01, 0.08)
            melody_step += 1

        if mood == "anxious" and bar % 3 == 1:
            add_noise(buffer, start + beat_duration * 0.5, min(bar_duration * 0.6, duration - start), 0.012, seed + bar)
        if mood == "sad" and bar % 4 == 2:
            chime_time = start + beat_duration * 2.4
            if chime_time < duration:
                add_note(buffer, chime_time, min(0.42, duration - chime_time), note_to_freq(scale[-1]) * 2, 0.035, "sine", 0.03, 0.32)

    fade_samples = min(total_samples // 6, SAMPLE_RATE * 4)
    for i in range(fade_samples):
        buffer[-fade_samples + i] *= (fade_samples - i) / fade_samples

    apply_echo(buffer, 60.0 / bpm * (1.5 if mood in {"calm", "sad"} else 0.75), style["echo"])
    return buffer


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for track in TRACKS:
        wav_path = OUTPUT_DIR / f"{track['slug']}.wav"
        print(f"Generating {track['title']} -> {wav_path.name}")
        buffer = build_track(track)
        pcm = normalize_to_pcm(buffer)
        write_wav(wav_path, pcm)

    print("Done.")


if __name__ == "__main__":
    main()
