# EARTHSONIC — Competition Project Description
**2026 NASA Space Apps Challenge | Challenge: The Earth Information Jukebox**

## Tagline
**"Listen to the Changing Planet — One Planet. Countless Stories. Hear Them All."**

## 1. The Problem
NASA’s Earth Information Center (EIC) and Earth-observing fleet capture extraordinary visual evidence of our changing planet—from record-breaking surface temperature anomalies to rising global sea levels and seasonal atmospheric carbon cycles. However, relying solely on visual charts and satellite maps makes it challenging for the general public to intuit multi-variable rhythms over time and creates a barrier for blind, low-vision, and auditory learners.

## 2. Our Solution: EarthSonic
**EarthSonic** is an interactive web-based scientific sonification platform that pairs authentic NASA Earth Information Center / EOSDIS GIBS visual frames with a real-time **Web Audio API** synthesis engine. Users can explore three signature Earth system experiences (**The Warming Planet**, **The Water Rhythm**, and **The Living Atmosphere**), scrub through decades of observations, compare any two historical timestamps in **"Hear the Change"**, and blend coupled environmental streams in **"The Earth Orchestra"**.

## 3. Technical & Creative Innovation
- **Zero Pre-Recorded Audio:** Every sound is synthesized in real time in the browser from actual NASA observations using `OscillatorNode`, `BiquadFilterNode`, FM synthesis, and filtered pink-noise resonators.
- **Multi-Dimensional Acoustic Mapping:** Each experience maps three documented NASA variables simultaneously—driving **Harmonic Pitch (Hz)**, **Rhythmic Pulse Density (BPM)**, and **Spectral Filter Brightness / Intensity (dBFS)**—with every mathematical formula transparently explained in the interface.
- **Signature "Hear the Change" Glide:** Users can select any two observations (e.g., 1956 vs. 2024 global temperature anomaly) and hear a continuous exponential frequency and filter transition between them, making abstract numerical deltas visceral and memorable.

## 4. NASA Data Utilization
EarthSonic integrates:
- **NASA GISS Surface Temperature Analysis (GISTEMP v4)** & **Aqua AIRS / Terra MODIS** thermal imagery
- **NASA JPL GHRSST Level-4 MUR Sea Surface Temperature**, **TOPEX/Jason/Sentinel-6 Global Mean Sea Level**, & **MODIS-Aqua Chlorophyll-a**
- **NASA Orbiting Carbon Observatory-2 (OCO-2) Column $\text{XCO}_2$** & **MODIS Value-Added Aerosol Optical Depth**
- **Live NASA Langley POWER API (MERRA-2 Assimilation)** for on-demand monthly telemetry at global sentinel coordinates.

## 5. Accessibility & Potential Impact
With built-in **Accessibility Mode** (`aria-live` screen-reader narration, full keyboard transport controls, high-contrast captions, and text-based tabular alternatives), EarthSonic empowers educators, museums, students, and visually impaired citizens to experience NASA Earth science through both sight and sound.
