# EARTHSONIC — 2.5-Minute Competition Demo Script
**2026 NASA Space Apps Challenge | The Earth Information Jukebox**

---

## 0:00 – 0:20 | Introduction: Listen to the Changing Planet
- **Visual Action:** Open EarthSonic on the **Home Landing Page**. Point out the headline *"LISTEN TO THE CHANGING PLANET"*, the live NASA telemetry pills (`GISTEMP +1.28°C`, `Altimetry GMSL +103.8 mm`, `OCO-2 424.6 ppm`), and the animated waveform preview.
- **Narration:**
  > "Hi judges! Welcome to **EarthSonic**—our interactive scientific sonification platform for the 2026 NASA Space Apps Challenge: *The Earth Information Jukebox*. NASA satellites capture extraordinary visualizations of our changing planet, but static charts can obscure temporal rhythms and exclude visually impaired learners. EarthSonic transforms authentic NASA Earth Information Center visualizations and time series into real-time Web Audio synthesis."

---

## 0:20 – 0:45 | Experience 1: NASA Earth Visualization & Scientific Context
- **Visual Action:** Click **"EXPLORE EARTH"** to jump to the **Earth Explorer**. Show **Experience 1: The Warming Planet** with the authentic NASA Aqua AIRS & Terra MODIS surface temperature frames, colorbar legend, and official GISTEMP v4 attribution. Click through the 4 historical NASA satellite keyframes (`2004`, `2016 El Niño`, `2023`, `2024`).
- **Narration:**
  > "In the Earth Explorer, every visual frame comes directly from NASA EOSDIS GIBS Worldview and Goddard archives with full scientific color scales and mission citations. Below the frame, our synchronized telemetry chart tracks NASA’s GISTEMP v4 global temperature anomaly from `-0.19°C` in 1956 to `+1.28°C` in 2024."

---

## 0:45 – 1:15 | Real-Time Web Audio Sonification in Action
- **Visual Action:** Press **"PLAY SONIFICATION"** in the bottom Jukebox Transport Deck. Point to the live FFT Frequency Spectrum + Waveform canvas in the top-right of the visual stage, and scroll slightly to the **Sonification Mapping Matrix** on the right panel. Switch briefly to **2. The Water Rhythm** and **3. The Living Atmosphere** so judges hear the distinct FM aquatic pluck and OCO-2 seasonal breathing wave.
- **Narration:**
  > "There are zero pre-recorded MP3s here. Our native Web Audio API engine converts each observation into sound in real time. In *The Warming Planet*, negative anomalies in the 1950s and 60s sound as calm, low-register sine waves at 146 Hz. As global warming crosses `+1.0°C`, the pitch climbs over two octaves to `587 Hz` while continental thermal variance accelerates the rhythmic pulse from 72 to 148 BPM. Switching to *The Living Atmosphere*, you can literally hear Earth’s biosphere breathe—every boreal summer drawdown dips the pitch before fossil-fuel emissions push the next spring peak higher."

---

## 1:15 – 1:45 | Signature Feature: "Hear the Change"
- **Visual Action:** Click **"Hear the Change"** in the top navigation bar. Select **Observation A = 1956 (-0.19°C)** and **Observation B = 2024 (+1.28°C)**. Point out the calculated `+1.47°C` delta and `+440.5 Hz` pitch shift, then click **"HEAR THE DIFFERENCE (A → B)"**.
- **Narration:**
  > "Our signature feature is **Hear the Change**. By selecting 1956 as Observation A and 2024 as Observation B, EarthSonic computes the exact `+1.47°C` warming delta and lets us hear a continuous exponential frequency glide from `146.8 Hz` (`D3`) up to `587.3 Hz` (`D5`). In three seconds, anyone can hear 70 years of planetary warming."

---

## 1:45 – 2:15 | The Earth Orchestra, Live NASA POWER API & Accessibility
- **Visual Action:** Scroll to **The Earth Orchestra**, toggle the three layers (Temperature, Water Rhythm, Living Atmosphere) and tweak the Sound Studio controls. Then click **"Accessibility Mode: ON"** in the top header to reveal the live screen-reader caption banner and the full accessible HTML data table.
- **Narration:**
  > "In **The Earth Orchestra**, users can layer Temperature, Ocean Sea Level, and Atmospheric Carbon into a single three-part ensemble, or fetch live monthly MERRA-2 observations from NASA Langley’s POWER API. And with **Accessibility Mode**, blind and low-vision learners get live `aria-live` narration, full keyboard navigation, and complete tabular alternatives."

---

## 2:15 – 2:30 | Closing Impact
- **Visual Action:** Return to the main view and pause playback.
- **Narration:**
  > "EarthSonic proves that when we pair NASA’s visual excellence with transparent, real-time sonification, Earth science becomes more intuitive, memorable, and accessible to everyone. Thank you—and let’s listen to our changing planet!"
