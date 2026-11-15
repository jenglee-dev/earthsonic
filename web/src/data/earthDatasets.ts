import type { EarthExperience, ExperienceId } from '../types/earthsonic';

export const EARTH_EXPERIENCES: Record<ExperienceId, EarthExperience> = {
  temperature: {
    id: 'temperature',
    title: 'The Warming Planet: Global Temperature Changes',
    shortTitle: 'The Warming Planet',
    subtitle: 'NASA GISTEMP v4 & Aqua AIRS / MERRA-2 Thermal Reanalysis (1956–2024)',
    themeColor: '#FFC66D',
    themeGlowClass: 'from-[#FFC66D]/20 via-[#FFC66D]/5 to-transparent',
    badgeText: 'GISTEMP v4 / AIRS / MERRA-2',
    datasetTitle: 'NASA GISS Surface Temperature Analysis (GISTEMP v4) & MERRA-2 2m Air Temperature',
    nasaCitation:
      'GISTEMP Team, 2024: GISS Surface Temperature Analysis (GISTEMP), version 4. NASA Goddard Institute for Space Studies. Dataset accessed via data.giss.nasa.gov/gistemp & NASA GIBS AIRS/MERRA-2.',
    nasaSourceUrl: 'https://data.giss.nasa.gov/gistemp/',
    instrumentSummary:
      'Combined land-surface air temperature (GHCN v4 meteorological stations), sea-surface temperature (ERSST v5), Aqua AIRS infrared sounding, and MERRA-2 assimilation.',
    scientificOverview:
      'Higher pitch represents a higher temperature anomaly within the selected dataset’s scale. Global surface temperature anomalies measure how much warmer or cooler Earth is compared to the 1951–1980 baseline average. Negative anomalies (cooler than baseline, such as 1956 or 1964) produce soft, low-register sine tones, while modern positive anomalies (+1.17°C to +1.28°C) increase harmonic tension and shift the pitch upward.',
    whatYouAreHearing: [
      'Higher pitch represents a higher temperature anomaly within the selected dataset’s scale (from -0.20°C below baseline in the mid-20th century to +1.28°C in 2024).',
      'Negative anomalies (< 0.0°C) use a gentle pure sine wave with minor third intervals; positive anomalies (> 0.0°C) introduce warm sawtooth harmonics and rising tension.',
      'Rhythmic Pulse & Filter Brightness track Diurnal/Latitudinal Thermal Variance (MERRA-2 T2M_RANGE) and radiative heat accumulation.'
    ],
    synthPresetName: 'Warm Analog Thermal Polysynth',
    synthDescription:
      'Smooth continuous oscillator voice that transitions from pure low-register sine waves during negative temperature anomalies to harmonically rich sawtooth/triangle chords during positive warming peaks.',
    mappings: {
      pitch: {
        parameter: 'pitch',
        label: 'Harmonic Pitch (Frequency)',
        variableName: 'Global Land-Ocean Temp Anomaly',
        variableCode: 'GISTEMP_DT',
        unit: '°C vs 1951–1980',
        minData: -0.25,
        maxData: 1.35,
        minAudio: 130.81,
        maxAudio: 587.33,
        audioUnit: 'Hz',
        formulaDescription: 'normalized = (T - (-0.25)) / (1.35 - (-0.25)); f(T) = 130.81 × 2^(normalized × 2.16)',
        musicalExplanation:
          'Higher pitch represents a higher temperature anomaly within the selected dataset’s scale. Negative anomalies sound in deeper, calmer registers while +1.0°C+ anomalies ring in bright upper octaves.'
      },
      rhythm: {
        parameter: 'rhythm',
        label: 'Rhythmic Pulse (Tempo)',
        variableName: 'Diurnal & Latitudinal Thermal Variance',
        variableCode: 'MERRA2_T2M_VAR',
        unit: '°C spread',
        minData: 8.0,
        maxData: 14.5,
        minAudio: 70,
        maxAudio: 148,
        audioUnit: 'BPM',
        formulaDescription: 'BPM(V) = 70 + ((V - 8.0) / 6.5) × 78',
        musicalExplanation:
          'Wider continental temperature swings speed up the rhythmic subdivision rate, creating a tighter, more urgent pulse during extreme heat years.'
      },
      intensity: {
        parameter: 'intensity',
        label: 'Sound Intensity & Timbre Cutoff',
        variableName: 'Radiative Heat Accumulation Index',
        variableCode: 'CERES_EBAF_NET',
        unit: 'W/m²',
        minData: 0.2,
        maxData: 1.4,
        minAudio: -18,
        maxAudio: -2,
        audioUnit: 'dBFS',
        formulaDescription: 'Gain(E) = -18 + ((E - 0.2) / 1.2) × 16 dB; Filter Cutoff = 380–3400 Hz',
        musicalExplanation:
          'Higher net radiative heat imbalance increases acoustic volume and opens the low-pass filter, transforming a muted hum into a bright, resonant brassy chord.'
      }
    },
    visualFrames: [
      {
        id: 'temp-frame-1',
        title: 'Global Surface Air Temperature (Aqua AIRS Day)',
        dateLabel: 'July 2004 — Early 2000s Baseline',
        isoDate: '2004-07-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2004-07-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,AIRS_L3_Surface_Air_Temperature_Daily_Day&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000437/GSFC_20171208_Archive_e000437~thumb.jpg',
        gibsLayer: 'AIRS_L3_Surface_Air_Temperature_Daily_Day',
        missionInstrument: 'NASA Aqua Satellite / Atmospheric Infrared Sounder (AIRS)',
        credit: 'NASA Earth Information Center / EOSDIS GIBS Worldview',
        sourceUrl: 'https://worldview.earthdata.nasa.gov/?l=AIRS_L3_Surface_Air_Temperature_Daily_Day,BlueMarble_NextGeneration&t=2004-07-15-T00%3A00%3A00Z',
        caption:
          'Aqua AIRS Level-3 Daytime Surface Air Temperature retrieval across the globe on July 15, 2004, showing boreal summer heating across North Africa, Eurasia, and North America.',
        colorScaleLabel: 'Surface Air Temperature (K / °C)',
        colorScaleGradient: 'linear-gradient(90deg, #313695 0%, #4575b4 25%, #ffffbf 55%, #f46d43 80%, #a50026 100%)',
        colorScaleMin: '-40°C (233 K)',
        colorScaleMax: '+45°C (318 K)'
      },
      {
        id: 'temp-frame-2',
        title: 'Super El Niño Peak Land Surface Temperature (MODIS Terra)',
        dateLabel: 'July 2016 — Record El Niño Surge',
        isoDate: '2016-07-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2016-07-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,MODIS_Terra_Land_Surface_Temp_Day&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/analyses-reveal-record-shattering-global-warm-temperatures-in-2015_24476162096_o/analyses-reveal-record-shattering-global-warm-temperatures-in-2015_24476162096_o~thumb.jpg',
        gibsLayer: 'MODIS_Terra_Land_Surface_Temp_Day',
        missionInstrument: 'NASA Terra Satellite / MODIS Land Surface Temperature',
        credit: 'NASA Earth Information Center / LP DAAC / GIBS',
        sourceUrl: 'https://worldview.earthdata.nasa.gov/?l=MODIS_Terra_Land_Surface_Temp_Day,BlueMarble_NextGeneration&t=2016-07-15-T00%3A00%3A00Z',
        caption:
          'MODIS Terra daytime land skin temperature during July 2016, when global surface temperature anomalies first exceeded +1.01°C above the 1951–1980 baseline.',
        colorScaleLabel: 'Land Skin Temperature (°C)',
        colorScaleGradient: 'linear-gradient(90deg, #2b83ba 0%, #abdda4 30%, #ffffbf 55%, #fdae61 80%, #d7191c 100%)',
        colorScaleMin: '-25°C',
        colorScaleMax: '+60°C'
      },
      {
        id: 'temp-frame-3',
        title: 'MERRA-2 2-Meter Assimilated Air Temperature',
        dateLabel: 'July 2023 — Modern Record Thermal Peak',
        isoDate: '2023-07-01',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2023-07-01&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,AIRS_L3_Surface_Air_Temperature_Daily_Day&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000437/GSFC_20171208_Archive_e000437~thumb.jpg',
        gibsLayer: 'AIRS_L3_Surface_Air_Temperature_Daily_Day',
        missionInstrument: 'NASA Aqua AIRS & GMAO MERRA-2 Reanalysis',
        credit: 'NASA Goddard Global Modeling and Assimilation Office (GMAO)',
        sourceUrl: 'https://worldview.earthdata.nasa.gov/?l=AIRS_L3_Surface_Air_Temperature_Daily_Day,BlueMarble_NextGeneration&t=2023-07-01-T00%3A00%3A00Z',
        caption:
          'July 2023 marked the warmest month in NASA GISTEMP instrumental history, with widespread high-latitude Arctic amplification and intense marine & continental heatwaves.',
        colorScaleLabel: 'Surface Air Temperature (°C)',
        colorScaleGradient: 'linear-gradient(90deg, #313695 0%, #4575b4 25%, #ffffbf 55%, #f46d43 80%, #a50026 100%)',
        colorScaleMin: '-40°C',
        colorScaleMax: '+48°C'
      },
      {
        id: 'temp-frame-4',
        title: 'GISTEMP Global Warming Anomaly Archive Frame',
        dateLabel: '2024 — +1.28°C Planetary Anomaly',
        isoDate: '2024-07-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2024-07-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,MODIS_Terra_Land_Surface_Temp_Day&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000437/GSFC_20171208_Archive_e000437~thumb.jpg',
        gibsLayer: 'MODIS_Terra_Land_Surface_Temp_Day',
        missionInstrument: 'NASA Terra MODIS & GISS GISTEMP v4',
        credit: 'NASA Goddard Institute for Space Studies (GISS)',
        sourceUrl: 'https://earth.gov/',
        caption:
          '2024 full-globe thermal observation showing sustained record land-surface heating across low and high latitudes.',
        colorScaleLabel: 'Land Surface Temperature (°C)',
        colorScaleGradient: 'linear-gradient(90deg, #313695 0%, #74add1 25%, #fee090 55%, #f46d43 80%, #a50026 100%)',
        colorScaleMin: '-25°C',
        colorScaleMax: '+60°C'
      }
    ],
    // Published NASA GISTEMP v4 Global Land-Ocean Temperature Index (LOTI) series 1956–2024 (in °C relative to 1951-1980 base period, including negative and positive anomalies)
    referenceSeries: [
      { index: 0, dateLabel: '1956', isoDate: '1956-07-15', primaryValue: -0.19, secondaryValue: 8.2, tertiaryValue: 0.20, annotation: '1956 Negative Anomaly Cooler than 1951–1980 Baseline (-0.19°C)' },
      { index: 1, dateLabel: '1964', isoDate: '1964-07-15', primaryValue: -0.20, secondaryValue: 8.1, tertiaryValue: 0.19, annotation: '1964 Post-Mt. Agung Volcanic Cooling (-0.20°C)' },
      { index: 2, dateLabel: '1971', isoDate: '1971-07-15', primaryValue: -0.08, secondaryValue: 8.4, tertiaryValue: 0.23, annotation: '1971 La Niña Negative Anomaly (-0.08°C)' },
      { index: 3, dateLabel: '1976', isoDate: '1976-07-15', primaryValue: -0.10, secondaryValue: 8.3, tertiaryValue: 0.22, annotation: '1976 Last Year Below 1951–1980 Average (-0.10°C)' },
      { index: 4, dateLabel: '1980', isoDate: '1980-07-15', primaryValue: 0.26, secondaryValue: 9.1, tertiaryValue: 0.34, annotation: '1980 Positive Warming Shift (+0.26°C)' },
      { index: 5, dateLabel: '1982', isoDate: '1982-07-15', primaryValue: 0.14, secondaryValue: 8.8, tertiaryValue: 0.28, annotation: 'El Chichón Volcanic Aerosol Cooling (+0.14°C)' },
      { index: 6, dateLabel: '1986', isoDate: '1986-07-15', primaryValue: 0.18, secondaryValue: 9.2, tertiaryValue: 0.35 },
      { index: 7, dateLabel: '1988', isoDate: '1988-07-15', primaryValue: 0.39, secondaryValue: 9.8, tertiaryValue: 0.46, annotation: '1988 North American Drought & Heatwave (+0.39°C)' },
      { index: 8, dateLabel: '1990', isoDate: '1990-07-15', primaryValue: 0.45, secondaryValue: 10.1, tertiaryValue: 0.52 },
      { index: 9, dateLabel: '1992', isoDate: '1992-07-15', primaryValue: 0.22, secondaryValue: 8.9, tertiaryValue: 0.30, annotation: 'Post-Mt. Pinatubo Stratospheric Aerosol Cooling (+0.22°C)' },
      { index: 10, dateLabel: '1995', isoDate: '1995-07-15', primaryValue: 0.45, secondaryValue: 9.7, tertiaryValue: 0.49 },
      { index: 11, dateLabel: '1998', isoDate: '1998-07-15', primaryValue: 0.61, secondaryValue: 11.2, tertiaryValue: 0.69, annotation: '1997–1998 Major El Niño Event (+0.61°C)' },
      { index: 12, dateLabel: '2000', isoDate: '2000-07-15', primaryValue: 0.39, secondaryValue: 10.0, tertiaryValue: 0.55 },
      { index: 13, dateLabel: '2003', isoDate: '2003-07-15', primaryValue: 0.62, secondaryValue: 10.8, tertiaryValue: 0.68 },
      { index: 14, dateLabel: '2006', isoDate: '2006-07-15', primaryValue: 0.64, secondaryValue: 11.0, tertiaryValue: 0.72 },
      { index: 15, dateLabel: '2008', isoDate: '2008-07-15', primaryValue: 0.54, secondaryValue: 10.6, tertiaryValue: 0.67, annotation: '2008 La Niña Temporary Dip (+0.54°C)' },
      { index: 16, dateLabel: '2010', isoDate: '2010-07-15', primaryValue: 0.72, secondaryValue: 11.6, tertiaryValue: 0.81 },
      { index: 17, dateLabel: '2013', isoDate: '2013-07-15', primaryValue: 0.68, secondaryValue: 11.5, tertiaryValue: 0.80 },
      { index: 18, dateLabel: '2016', isoDate: '2016-07-15', primaryValue: 1.01, secondaryValue: 12.9, tertiaryValue: 1.08, annotation: '2016 Super El Niño — First Year Above +1.0°C (+1.01°C)' },
      { index: 19, dateLabel: '2018', isoDate: '2018-07-15', primaryValue: 0.85, secondaryValue: 12.2, tertiaryValue: 0.95 },
      { index: 20, dateLabel: '2020', isoDate: '2020-07-15', primaryValue: 1.01, secondaryValue: 13.0, tertiaryValue: 1.11, annotation: '2020 Ties Record despite La Niña (+1.01°C)' },
      { index: 21, dateLabel: '2022', isoDate: '2022-07-15', primaryValue: 0.89, secondaryValue: 12.6, tertiaryValue: 1.04 },
      { index: 22, dateLabel: '2023', isoDate: '2023-07-15', primaryValue: 1.17, secondaryValue: 13.8, tertiaryValue: 1.26, annotation: '2023 Unprecedented Global Thermal Jump (+1.17°C)' },
      { index: 23, dateLabel: '2024', isoDate: '2024-07-15', primaryValue: 1.28, secondaryValue: 14.2, tertiaryValue: 1.35, annotation: '2024 Warmest Year in NASA GISTEMP Record (+1.28°C)' }
    ],
    comparisonBaselineTitle: 'Mid-20th Century Reference Baseline (1950–1973 GISTEMP v4)',
    comparisonBaselineSeries: [
      { index: 0, dateLabel: '1950', isoDate: '1950-07-15', primaryValue: -0.17, secondaryValue: 8.3, tertiaryValue: 0.21 },
      { index: 1, dateLabel: '1951', isoDate: '1951-07-15', primaryValue: -0.07, secondaryValue: 8.5, tertiaryValue: 0.24 },
      { index: 2, dateLabel: '1952', isoDate: '1952-07-15', primaryValue: 0.01, secondaryValue: 8.6, tertiaryValue: 0.26 },
      { index: 3, dateLabel: '1953', isoDate: '1953-07-15', primaryValue: 0.08, secondaryValue: 8.8, tertiaryValue: 0.29 },
      { index: 4, dateLabel: '1954', isoDate: '1954-07-15', primaryValue: -0.13, secondaryValue: 8.4, tertiaryValue: 0.22 },
      { index: 5, dateLabel: '1955', isoDate: '1955-07-15', primaryValue: -0.14, secondaryValue: 8.3, tertiaryValue: 0.21 },
      { index: 6, dateLabel: '1956', isoDate: '1956-07-15', primaryValue: -0.19, secondaryValue: 8.2, tertiaryValue: 0.20 },
      { index: 7, dateLabel: '1957', isoDate: '1957-07-15', primaryValue: 0.05, secondaryValue: 8.7, tertiaryValue: 0.28 },
      { index: 8, dateLabel: '1958', isoDate: '1958-07-15', primaryValue: 0.06, secondaryValue: 8.7, tertiaryValue: 0.29 },
      { index: 9, dateLabel: '1959', isoDate: '1959-07-15', primaryValue: 0.03, secondaryValue: 8.6, tertiaryValue: 0.27 },
      { index: 10, dateLabel: '1960', isoDate: '1960-07-15', primaryValue: -0.03, secondaryValue: 8.5, tertiaryValue: 0.25 },
      { index: 11, dateLabel: '1961', isoDate: '1961-07-15', primaryValue: 0.06, secondaryValue: 8.7, tertiaryValue: 0.28 },
      { index: 12, dateLabel: '1962', isoDate: '1962-07-15', primaryValue: 0.03, secondaryValue: 8.6, tertiaryValue: 0.27 },
      { index: 13, dateLabel: '1963', isoDate: '1963-07-15', primaryValue: 0.05, secondaryValue: 8.7, tertiaryValue: 0.28 },
      { index: 14, dateLabel: '1964', isoDate: '1964-07-15', primaryValue: -0.20, secondaryValue: 8.1, tertiaryValue: 0.19, annotation: 'Mt. Agung Volcanic Cooling (-0.20°C)' },
      { index: 15, dateLabel: '1965', isoDate: '1965-07-15', primaryValue: -0.11, secondaryValue: 8.3, tertiaryValue: 0.22 },
      { index: 16, dateLabel: '1966', isoDate: '1966-07-15', primaryValue: -0.06, secondaryValue: 8.4, tertiaryValue: 0.24 },
      { index: 17, dateLabel: '1967', isoDate: '1967-07-15', primaryValue: -0.02, secondaryValue: 8.5, tertiaryValue: 0.25 },
      { index: 18, dateLabel: '1968', isoDate: '1968-07-15', primaryValue: -0.08, secondaryValue: 8.4, tertiaryValue: 0.23 },
      { index: 19, dateLabel: '1969', isoDate: '1969-07-15', primaryValue: 0.05, secondaryValue: 8.7, tertiaryValue: 0.29 },
      { index: 20, dateLabel: '1970', isoDate: '1970-07-15', primaryValue: 0.03, secondaryValue: 8.6, tertiaryValue: 0.27 },
      { index: 21, dateLabel: '1971', isoDate: '1971-07-15', primaryValue: -0.08, secondaryValue: 8.4, tertiaryValue: 0.23 },
      { index: 22, dateLabel: '1972', isoDate: '1972-07-15', primaryValue: 0.01, secondaryValue: 8.6, tertiaryValue: 0.26 },
      { index: 23, dateLabel: '1973', isoDate: '1973-07-15', primaryValue: 0.16, secondaryValue: 8.9, tertiaryValue: 0.31 }
    ],
    observatorySites: [
      { id: 'svalbard', name: 'Ny-Ålesund Arctic Station', region: 'Svalbard, Norway (78.9°N)', latitude: 78.923, longitude: 11.923, description: 'High-Arctic sentinel experiencing 3–4× global average warming amplification.' },
      { id: 'mauna-loa', name: 'Mauna Loa Observatory', region: 'Hawaii, USA (19.5°N)', latitude: 19.536, longitude: -155.576, description: 'Benchmark subtropical mountain atmospheric research station.' },
      { id: 'manaus', name: 'Amazon Tall Tower Region', region: 'Amazonas, Brazil (3.1°S)', latitude: -3.119, longitude: -60.021, description: 'Equatorial tropical rainforest thermal & moisture flux sentinel.' },
      { id: 'goddard', name: 'NASA GSFC Greenbelt', region: 'Maryland, USA (39.0°N)', latitude: 38.992, longitude: -76.852, description: 'Mid-latitude continental climate reference at NASA Goddard Space Flight Center.' }
    ]
  },

  ocean: {
    id: 'ocean',
    title: 'The Water Rhythm: Sea Level Rise & Ocean Thermal State',
    shortTitle: 'The Water Rhythm',
    subtitle: 'GHRSST MUR SST, Satellite Altimetry GMSL & Upper Ocean Heat Content',
    themeColor: '#52C7F5',
    themeGlowClass: 'from-[#52C7F5]/20 via-[#52C7F5]/5 to-transparent',
    badgeText: 'GHRSST / JASON-3 / SENTINEL-6',
    datasetTitle: 'NASA JPL Multi-Scale Ultra-High Resolution (MUR) SST & TOPEX/Jason/Sentinel-6 Global Mean Sea Level',
    nasaCitation:
      'NASA Sea Level Change Team / JPL PO.DAAC (2024): Global Mean Sea Level Trend from Integrated Multi-Mission Ocean Altimeters (1993–2024) & GHRSST Level 4 MUR Global Foundation SST.',
    nasaSourceUrl: 'https://sealevel.nasa.gov/',
    instrumentSummary:
      'TOPEX/Poseidon, Jason-1/2/3, and Sentinel-6 Michael Freilich radar altimeters paired with Aqua MODIS & Suomi-NPP VIIRS infrared/microwave sea surface radiometry.',
    scientificOverview:
      'Earth’s oceans absorb over 90% of the excess heat trapped by greenhouse gases. This thermal expansion—combined with meltwater from Greenland and Antarctica—has raised global mean sea level by over 101 mm since 1993, while marine heatwaves reshape surface chlorophyll-a productivity.',
    whatYouAreHearing: [
      'Fundamental Pitch tracks Global Mean Sea Surface Temperature Anomaly (°C) and steric thermal state using a crystalline FM bell/marimba synthesis voice in A Minor Pentatonic.',
      'Rhythmic Swell & Arpeggio Rate follows Satellite Altimetry Global Mean Sea Level Rise (mm above 1993 datum), accelerating steady wave-like pulses as sea level climbs past +100 mm.',
      'Sound Intensity & Sub-Bass Harmonics respond to Upper-Ocean Heat Content (10²² Joules) and Chlorophyll-a nutrient upwelling index, deepening low-end resonance during intense marine heatwaves.'
    ],
    synthPresetName: 'Crystalline Marine FM Pluck & Sub-Wave',
    synthDescription:
      '2-operator frequency-modulated (FM) glassy bell voice layered with a deep sine sub-oscillator and stereo delay feedback.',
    mappings: {
      pitch: {
        parameter: 'pitch',
        label: 'Harmonic Pitch (FM Carrier)',
        variableName: 'Global Sea Surface Temp Anomaly',
        variableCode: 'GHRSST_SST_ANOM',
        unit: '°C vs 1982–2010',
        minData: 0.05,
        maxData: 0.95,
        minAudio: 146.83,
        maxAudio: 523.25,
        audioUnit: 'Hz',
        formulaDescription: 'f(SST) = 146.83 × 2^(((SST - 0.05) / 0.90) × 1.83) quantized to A Minor Pentatonic',
        musicalExplanation:
          'Cooler La Niña ocean phases sound in deep aquatic mid-low registers (147–220 Hz), while record 2023–2024 North Atlantic and Pacific marine heatwaves ring above 440 Hz.'
      },
      rhythm: {
        parameter: 'rhythm',
        label: 'Tidal Pulse Rate (Tempo)',
        variableName: 'Global Mean Sea Level (GMSL) Rise',
        variableCode: 'JASON_GMSL_MM',
        unit: 'mm vs 1993',
        minData: 0.0,
        maxData: 105.0,
        minAudio: 68,
        maxAudio: 138,
        audioUnit: 'BPM',
        formulaDescription: 'BPM(SL) = 68 + (SL / 105.0) × 70',
        musicalExplanation:
          'As global mean sea level rises from 0 mm (1993 TOPEX datum) to +103 mm (2024 Sentinel-6), the tidal pulse tempo increases from a slow 68 BPM swell to 138 BPM.'
      },
      intensity: {
        parameter: 'intensity',
        label: 'Acoustic Depth & FM Modulation Index',
        variableName: 'Upper Ocean Heat Content (0–2000m)',
        variableCode: 'ECCO_OHC_ZJ',
        unit: 'Zettajoules (10²¹ J)',
        minData: 40,
        maxData: 360,
        minAudio: -17,
        maxAudio: -2,
        audioUnit: 'dBFS',
        formulaDescription: 'Gain(OHC) = -17 + ((OHC - 40) / 320) × 15 dB; FM Index = 0.6 to 3.8',
        musicalExplanation:
          'Accumulated ocean heat energy intensifies both the acoustic amplitude and the FM metallic shimmer, reflecting thermal stratification in the upper ocean.'
      }
    },
    visualFrames: [
      {
        id: 'ocean-frame-1',
        title: 'Global Sea Surface Temperature (JPL GHRSST MUR L4)',
        dateLabel: 'July 2015 — Developing Pacific El Niño Tongue',
        isoDate: '2015-07-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2015-07-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,GHRSST_L4_MUR_Sea_Surface_Temperature&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/PIA18034/PIA18034~small.jpg',
        gibsLayer: 'GHRSST_L4_MUR_Sea_Surface_Temperature',
        missionInstrument: 'NASA JPL PO.DAAC / GHRSST Level-4 MUR (0.01° Grid)',
        credit: 'NASA JPL Physical Oceanography DAAC / Earth Information Center',
        sourceUrl: 'https://worldview.earthdata.nasa.gov/?l=GHRSST_L4_MUR_Sea_Surface_Temperature,BlueMarble_NextGeneration&t=2015-07-15-T00%3A00%3A00Z',
        caption:
          'Multi-scale Ultra-high Resolution (MUR) Sea Surface Temperature blending MODIS, AVHRR, and microwave radiometers, capturing the equatorial Pacific warm pool and Gulf Stream meanders.',
        colorScaleLabel: 'Sea Surface Temperature (°C)',
        colorScaleGradient: 'linear-gradient(90deg, #081d58 0%, #225ea8 25%, #41b6c4 50%, #fed976 75%, #e31a1c 100%)',
        colorScaleMin: '-2°C',
        colorScaleMax: '+34°C'
      },
      {
        id: 'ocean-frame-2',
        title: 'Global Marine Phytoplankton Chlorophyll-a (MODIS Aqua)',
        dateLabel: 'July 2019 — Boreal Summer Ocean Productivity',
        isoDate: '2019-07-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2019-07-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,MODIS_Aqua_Chlorophyll_A&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/PIA18034/PIA18034~small.jpg',
        gibsLayer: 'MODIS_Aqua_Chlorophyll_A',
        missionInstrument: 'NASA Aqua Satellite / MODIS Ocean Color',
        credit: 'NASA Ocean Biology Processing Group (OBPG) / GSFC',
        sourceUrl: 'https://worldview.earthdata.nasa.gov/?l=MODIS_Aqua_Chlorophyll_A,BlueMarble_NextGeneration&t=2019-07-15-T00%3A00%3A00Z',
        caption:
          'MODIS-Aqua near-surface Chlorophyll-a concentration (mg/m³) showing nutrient-rich subpolar blooms and equatorial upwelling zones.',
        colorScaleLabel: 'Chlorophyll-a Concentration (mg/m³)',
        colorScaleGradient: 'linear-gradient(90deg, #0c2c84 0%, #1d91c0 30%, #7fcdbb 55%, #f7fcb9 80%, #d95f0e 100%)',
        colorScaleMin: '0.01 mg/m³',
        colorScaleMax: '20.0 mg/m³'
      },
      {
        id: 'ocean-frame-3',
        title: '2023 North Atlantic & Global Marine Heatwave (GHRSST MUR)',
        dateLabel: 'August 2023 — Record Global SST Peak',
        isoDate: '2023-08-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2023-08-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,GHRSST_L4_MUR_Sea_Surface_Temperature&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/PIA18034/PIA18034~small.jpg',
        gibsLayer: 'GHRSST_L4_MUR_Sea_Surface_Temperature',
        missionInstrument: 'NASA JPL GHRSST MUR & Sentinel-6 Altimetry Era',
        credit: 'NASA JPL PO.DAAC / Earth Information Center',
        sourceUrl: 'https://worldview.earthdata.nasa.gov/?l=GHRSST_L4_MUR_Sea_Surface_Temperature,BlueMarble_NextGeneration&t=2023-08-15-T00%3A00%3A00Z',
        caption:
          'In August 2023, global mean sea surface temperatures reached unprecedented levels (+0.89°C anomaly), accompanied by extreme coral bleaching stress across the Caribbean and Tropical Pacific.',
        colorScaleLabel: 'Sea Surface Temperature (°C)',
        colorScaleGradient: 'linear-gradient(90deg, #081d58 0%, #225ea8 25%, #41b6c4 50%, #fed976 75%, #e31a1c 100%)',
        colorScaleMin: '-2°C',
        colorScaleMax: '+34°C'
      },
      {
        id: 'ocean-frame-4',
        title: '2024 Global Ocean Thermal State (GHRSST MUR L4)',
        dateLabel: 'July 2024 — Sustained Ocean Heat Content Record',
        isoDate: '2024-07-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2024-07-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,GHRSST_L4_MUR_Sea_Surface_Temperature&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/PIA18034/PIA18034~small.jpg',
        gibsLayer: 'GHRSST_L4_MUR_Sea_Surface_Temperature',
        missionInstrument: 'NASA JPL GHRSST Level-4 MUR',
        credit: 'NASA JPL / Earth Information Center',
        sourceUrl: 'https://sealevel.nasa.gov/',
        caption:
          'July 2024 global foundation sea surface temperature distribution alongside +103 mm cumulative satellite altimetry sea level rise.',
        colorScaleLabel: 'Sea Surface Temperature (°C)',
        colorScaleGradient: 'linear-gradient(90deg, #081d58 0%, #225ea8 25%, #41b6c4 50%, #fed976 75%, #e31a1c 100%)',
        colorScaleMin: '-2°C',
        colorScaleMax: '+34°C'
      }
    ],
    // Published NASA Altimetry Era (1993–2024): primaryValue = Global SST Anomaly (°C), secondaryValue = GMSL Rise (mm vs 1993), tertiaryValue = Upper Ocean Heat Content Anomaly (ZJ vs 1981-2010)
    referenceSeries: [
      { index: 0, dateLabel: '1993', isoDate: '1993-07-15', primaryValue: 0.14, secondaryValue: 0.0, tertiaryValue: 52, annotation: 'TOPEX/Poseidon Altimetry Datum Launch (0.0 mm)' },
      { index: 1, dateLabel: '1995', isoDate: '1995-07-15', primaryValue: 0.21, secondaryValue: 6.2, tertiaryValue: 68 },
      { index: 2, dateLabel: '1997', isoDate: '1997-07-15', primaryValue: 0.39, secondaryValue: 14.8, tertiaryValue: 95, annotation: '1997–98 Pacific El Niño Thermal Expansion (+14.8 mm)' },
      { index: 3, dateLabel: '1999', isoDate: '1999-07-15', primaryValue: 0.19, secondaryValue: 17.5, tertiaryValue: 88, annotation: '1999 Strong La Niña Upwelling Phase' },
      { index: 4, dateLabel: '2001', isoDate: '2001-07-15', primaryValue: 0.31, secondaryValue: 24.3, tertiaryValue: 112 },
      { index: 5, dateLabel: '2003', isoDate: '2003-07-15', primaryValue: 0.38, secondaryValue: 31.0, tertiaryValue: 134, annotation: 'Aqua MODIS & Jason-1 Full Operational Constellation' },
      { index: 6, dateLabel: '2005', isoDate: '2005-07-15', primaryValue: 0.41, secondaryValue: 37.8, tertiaryValue: 155 },
      { index: 7, dateLabel: '2007', isoDate: '2007-07-15', primaryValue: 0.34, secondaryValue: 42.1, tertiaryValue: 164 },
      { index: 8, dateLabel: '2009', isoDate: '2009-07-15', primaryValue: 0.44, secondaryValue: 49.4, tertiaryValue: 182 },
      { index: 9, dateLabel: '2010', isoDate: '2010-07-15', primaryValue: 0.48, secondaryValue: 52.8, tertiaryValue: 194 },
      { index: 10, dateLabel: '2011', isoDate: '2011-07-15', primaryValue: 0.35, secondaryValue: 50.9, tertiaryValue: 189, annotation: '2011 La Niña Continental Water Storage Dip' },
      { index: 11, dateLabel: '2012', isoDate: '2012-07-15', primaryValue: 0.43, secondaryValue: 61.2, tertiaryValue: 208 },
      { index: 12, dateLabel: '2013', isoDate: '2013-07-15', primaryValue: 0.46, secondaryValue: 64.5, tertiaryValue: 221 },
      { index: 13, dateLabel: '2014', isoDate: '2014-07-15', primaryValue: 0.54, secondaryValue: 68.9, tertiaryValue: 238, annotation: '2014 Northeast Pacific "Warm Blob" Marine Heatwave' },
      { index: 14, dateLabel: '2015', isoDate: '2015-07-15', primaryValue: 0.66, secondaryValue: 76.5, tertiaryValue: 259 },
      { index: 15, dateLabel: '2016', isoDate: '2016-07-15', primaryValue: 0.71, secondaryValue: 79.8, tertiaryValue: 268, annotation: '2016 El Niño Peak SST (+0.71°C)' },
      { index: 16, dateLabel: '2017', isoDate: '2017-07-15', primaryValue: 0.61, secondaryValue: 81.4, tertiaryValue: 276 },
      { index: 17, dateLabel: '2018', isoDate: '2018-07-15', primaryValue: 0.56, secondaryValue: 85.1, tertiaryValue: 289 },
      { index: 18, dateLabel: '2019', isoDate: '2019-07-15', primaryValue: 0.65, secondaryValue: 90.2, tertiaryValue: 304 },
      { index: 19, dateLabel: '2020', isoDate: '2020-07-15', primaryValue: 0.63, secondaryValue: 92.8, tertiaryValue: 312, annotation: 'Sentinel-6 Michael Freilich Launch (+92.8 mm)' },
      { index: 20, dateLabel: '2021', isoDate: '2021-07-15', primaryValue: 0.57, secondaryValue: 95.6, tertiaryValue: 324 },
      { index: 21, dateLabel: '2022', isoDate: '2022-07-15', primaryValue: 0.62, secondaryValue: 98.4, tertiaryValue: 335 },
      { index: 22, dateLabel: '2023', isoDate: '2023-08-15', primaryValue: 0.89, secondaryValue: 101.4, tertiaryValue: 350, annotation: '2023 Global SST & +101.4 mm Sea Level Milestone' },
      { index: 23, dateLabel: '2024', isoDate: '2024-07-15', primaryValue: 0.93, secondaryValue: 103.8, tertiaryValue: 358, annotation: '2024 Record Ocean Heat & +103.8 mm Sea Level' }
    ],
    comparisonBaselineTitle: 'Early Satellite Altimetry Decade (1993–2004 Cyclical Baseline)',
    comparisonBaselineSeries: [
      { index: 0, dateLabel: '1993-Q1', isoDate: '1993-01-15', primaryValue: 0.12, secondaryValue: 0.0, tertiaryValue: 48 },
      { index: 1, dateLabel: '1993-Q3', isoDate: '1993-07-15', primaryValue: 0.14, secondaryValue: 1.8, tertiaryValue: 52 },
      { index: 2, dateLabel: '1994-Q1', isoDate: '1994-01-15', primaryValue: 0.15, secondaryValue: 3.1, tertiaryValue: 56 },
      { index: 3, dateLabel: '1994-Q3', isoDate: '1994-07-15', primaryValue: 0.19, secondaryValue: 4.5, tertiaryValue: 61 },
      { index: 4, dateLabel: '1995-Q1', isoDate: '1995-01-15', primaryValue: 0.22, secondaryValue: 5.8, tertiaryValue: 66 },
      { index: 5, dateLabel: '1995-Q3', isoDate: '1995-07-15', primaryValue: 0.20, secondaryValue: 7.2, tertiaryValue: 70 },
      { index: 6, dateLabel: '1996-Q1', isoDate: '1996-01-15', primaryValue: 0.16, secondaryValue: 8.9, tertiaryValue: 73 },
      { index: 7, dateLabel: '1996-Q3', isoDate: '1996-07-15', primaryValue: 0.18, secondaryValue: 10.4, tertiaryValue: 77 },
      { index: 8, dateLabel: '1997-Q1', isoDate: '1997-01-15', primaryValue: 0.25, secondaryValue: 12.1, tertiaryValue: 84 },
      { index: 9, dateLabel: '1997-Q3', isoDate: '1997-07-15', primaryValue: 0.39, secondaryValue: 14.8, tertiaryValue: 95 },
      { index: 10, dateLabel: '1998-Q1', isoDate: '1998-01-15', primaryValue: 0.44, secondaryValue: 16.2, tertiaryValue: 101 },
      { index: 11, dateLabel: '1998-Q3', isoDate: '1998-07-15', primaryValue: 0.36, secondaryValue: 15.9, tertiaryValue: 96 },
      { index: 12, dateLabel: '1999-Q1', isoDate: '1999-01-15', primaryValue: 0.21, secondaryValue: 16.8, tertiaryValue: 89 },
      { index: 13, dateLabel: '1999-Q3', isoDate: '1999-07-15', primaryValue: 0.19, secondaryValue: 17.5, tertiaryValue: 88 },
      { index: 14, dateLabel: '2000-Q1', isoDate: '2000-01-15', primaryValue: 0.20, secondaryValue: 19.2, tertiaryValue: 92 },
      { index: 15, dateLabel: '2000-Q3', isoDate: '2000-07-15', primaryValue: 0.24, secondaryValue: 21.0, tertiaryValue: 98 },
      { index: 16, dateLabel: '2001-Q1', isoDate: '2001-01-15', primaryValue: 0.28, secondaryValue: 22.8, tertiaryValue: 105 },
      { index: 17, dateLabel: '2001-Q3', isoDate: '2001-07-15', primaryValue: 0.31, secondaryValue: 24.3, tertiaryValue: 112 },
      { index: 18, dateLabel: '2002-Q1', isoDate: '2002-01-15', primaryValue: 0.34, secondaryValue: 26.5, tertiaryValue: 119 },
      { index: 19, dateLabel: '2002-Q3', isoDate: '2002-07-15', primaryValue: 0.36, secondaryValue: 28.4, tertiaryValue: 125 },
      { index: 20, dateLabel: '2003-Q1', isoDate: '2003-01-15', primaryValue: 0.37, secondaryValue: 29.8, tertiaryValue: 130 },
      { index: 21, dateLabel: '2003-Q3', isoDate: '2003-07-15', primaryValue: 0.38, secondaryValue: 31.0, tertiaryValue: 134 },
      { index: 22, dateLabel: '2004-Q1', isoDate: '2004-01-15', primaryValue: 0.35, secondaryValue: 32.9, tertiaryValue: 139 },
      { index: 23, dateLabel: '2004-Q3', isoDate: '2004-07-15', primaryValue: 0.36, secondaryValue: 34.5, tertiaryValue: 144 }
    ],
    observatorySites: [
      { id: 'nino34', name: 'Niño 3.4 Equatorial Pacific Buoy', region: 'Central Tropical Pacific (0°N, 140°W)', latitude: 0.0, longitude: -140.0, description: 'Primary ENSO sea-surface temperature and trade-wind coupling zone.' },
      { id: 'gulf-stream', name: 'Gulf Stream Western Boundary', region: 'North Atlantic (36.0°N, 65.0°W)', latitude: 36.0, longitude: -65.0, description: 'Rapid warm western boundary current transporting tropical heat poleward.' },
      { id: 'coral-sea', name: 'Great Barrier Reef Marine Sentinel', region: 'Coral Sea, Australia (18.3°S, 147.7°E)', latitude: -18.287, longitude: 147.699, description: 'Tropical reef ecosystem highly sensitive to marine heatwave degree-heating weeks.' }
    ]
  },

  atmosphere: {
    id: 'atmosphere',
    title: 'The Living Atmosphere: Carbon, Wind & Aerosols',
    shortTitle: 'The Living Atmosphere',
    subtitle: 'OCO-2 Column XCO2, MERRA-2 Tropospheric Wind & MODIS Aerosol Optical Depth',
    themeColor: '#8A7CFF',
    themeGlowClass: 'from-[#8A7CFF]/20 via-[#8A7CFF]/5 to-transparent',
    badgeText: 'OCO-2 / MERRA-2 / MODIS AOD',
    datasetTitle: 'NASA Orbiting Carbon Observatory-2 (OCO-2) Column XCO2 & MODIS Value-Added Aerosol Optical Depth',
    nasaCitation:
      'NASA OCO-2 Science Team / JPL (2024): OCO-2 Level 2 Bias-Corrected XCO2 Lite File & MODIS Terra/Aqua Combined Value-Added Aerosol Optical Depth (AOD 550nm).',
    nasaSourceUrl: 'https://ocov2.jpl.nasa.gov/',
    instrumentSummary:
      'OCO-2 three-channel high-resolution grating spectrometers (measuring near-infrared reflected sunlight absorbed by CO2 and O2), MODIS 550nm Aerosol Optical Depth, and Suomi-NPP OMPS.',
    scientificOverview:
      'NASA’s Orbiting Carbon Observatory-2 (OCO-2) measures the column-averaged dry-air mole fraction of carbon dioxide (XCO2) from space. Superimposed on the relentless upward climb (+2.4 ppm/year from fossil fuel emissions) is Earth’s "breathing cycle": every boreal spring and summer, Northern Hemisphere forests draw down CO2, creating a sawtooth harmonic wave.',
    whatYouAreHearing: [
      'Fundamental Pitch follows Column-Averaged Carbon Dioxide (XCO2 in ppm from 398 ppm in 2014 to 424 ppm in 2024), producing a rising sawtooth seasonal wave where every boreal summer drawdown briefly dips the pitch before climbing higher each winter.',
      'Rhythmic Pulse Speed maps to Global Tropospheric Wind & Circulation Index (MERRA-2 10m & Jet Transport m/s), driving atmospheric arpeggio motion.',
      'Sound Intensity & Filtered Breath Texture respond to MODIS Aerosol Optical Depth (AOD at 550 nm), adding lush harmonic shimmer and atmospheric noise bursts during major wildfire and volcanic aerosol plumes.'
    ],
    synthPresetName: 'Ethereal Spectral Pad & Harmonic Resonator',
    synthDescription:
      'Detuned harmonic sine/triangle choir pad paired with an aerosol-modulated bandpass wind resonator.',
    mappings: {
      pitch: {
        parameter: 'pitch',
        label: 'Harmonic Pitch (Breathing Wave)',
        variableName: 'Column-Averaged Dry-Air CO2 (XCO2)',
        variableCode: 'OCO2_XCO2_PPM',
        unit: 'ppm',
        minData: 396.0,
        maxData: 426.0,
        minAudio: 164.81,
        maxAudio: 587.33,
        audioUnit: 'Hz',
        formulaDescription: 'f(CO2) = 164.81 × 2^(((CO2 - 396) / 30) × 1.83) quantized to E Lydian',
        musicalExplanation:
          'You can literally hear the biosphere breathe: each spring/summer vegetation drawdown lowers the pitch by a musical third, while cumulative anthropogenic emissions push each subsequent peak higher.'
      },
      rhythm: {
        parameter: 'rhythm',
        label: 'Atmospheric Transport Tempo',
        variableName: 'Zonal Tropospheric Transport Speed',
        variableCode: 'MERRA2_WS10M',
        unit: 'm/s',
        minData: 5.5,
        maxData: 9.8,
        minAudio: 66,
        maxAudio: 136,
        audioUnit: 'BPM',
        formulaDescription: 'BPM(W) = 66 + ((W - 5.5) / 4.3) × 70',
        musicalExplanation:
          'Stronger hemispheric winter-spring wind transport accelerates the rhythmic pulse, mirroring how rapidly carbon and aerosols mix across latitudes.'
      },
      intensity: {
        parameter: 'intensity',
        label: 'Aerosol Shimmer & Filter Resonance',
        variableName: 'Aerosol Optical Depth (550 nm)',
        variableCode: 'MODIS_AOD_550',
        unit: 'τ (dimensionless)',
        minData: 0.11,
        maxData: 0.24,
        minAudio: -16,
        maxAudio: -2,
        audioUnit: 'dBFS',
        formulaDescription: 'Gain(AOD) = -16 + ((AOD - 0.11) / 0.13) × 14 dB',
        musicalExplanation:
          'Spikes in Aerosol Optical Depth—from Australian bushfires, Canadian wildfires, or Saharan dust transport—swell the harmonic intensity and high-frequency spectral texture.'
      }
    },
    visualFrames: [
      {
        id: 'atmo-frame-1',
        title: 'NASA OCO-2 Global Carbon Dioxide Concentration',
        dateLabel: 'October 2014 — OCO-2 First Light Global Map',
        isoDate: '2014-10-15',
        imageUrl:
          'https://images-assets.nasa.gov/image/PIA18815/PIA18815~small.jpg',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/PIA23781/PIA23781~small.jpg',
        gibsLayer: 'OCO2_XCO2_Archive',
        missionInstrument: 'NASA Orbiting Carbon Observatory-2 (OCO-2)',
        credit: 'NASA JPL / Caltech / OCO-2 Science Team (PIA18815)',
        sourceUrl: 'https://images.nasa.gov/details/PIA18815',
        caption:
          'OCO-2 satellite measurements of atmospheric carbon dioxide (XCO2) at the start of the mission in late 2014, when global concentrations averaged ~398 ppm.',
        colorScaleLabel: 'Column Carbon Dioxide XCO2 (ppm)',
        colorScaleGradient: 'linear-gradient(90deg, #1d4ed8 0%, #06b6d4 28%, #fde047 60%, #f97316 82%, #dc2626 100%)',
        colorScaleMin: '390 ppm',
        colorScaleMax: '425 ppm'
      },
      {
        id: 'atmo-frame-2',
        title: 'Global Aerosol Optical Depth (MODIS Combined Value-Added)',
        dateLabel: 'August 2020 — Biomass Burning & Saharan Dust Plumes',
        isoDate: '2020-08-20',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2020-08-20&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor,MODIS_Combined_Value_Added_AOD&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/PIA23781/PIA23781~small.jpg',
        gibsLayer: 'MODIS_Combined_Value_Added_AOD',
        missionInstrument: 'NASA Terra & Aqua MODIS Combined AOD (550 nm)',
        credit: 'NASA Earth Information Center / EOSDIS GIBS Worldview',
        sourceUrl: 'https://worldview.earthdata.nasa.gov/?l=MODIS_Combined_Value_Added_AOD,MODIS_Terra_CorrectedReflectance_TrueColor&t=2020-08-20-T00%3A00%3A00Z',
        caption:
          'MODIS True Color + Value-Added Aerosol Optical Depth on August 20, 2020, highlighting dense smoke aerosols over western North America, Central Africa, and the Amazon.',
        colorScaleLabel: 'Aerosol Optical Depth at 550 nm (τ)',
        colorScaleGradient: 'linear-gradient(90deg, #ffffcc 0%, #fed976 30%, #fd8d3c 60%, #e31a1c 85%, #800026 100%)',
        colorScaleMin: '0.05',
        colorScaleMax: '1.50+'
      },
      {
        id: 'atmo-frame-3',
        title: 'Tropospheric Sulfur Dioxide & Volcanic/Industrial Plumes (OMPS)',
        dateLabel: 'June 2023 — Boreal Wildfire & Tropospheric Aerosol Surge',
        isoDate: '2023-06-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2023-06-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor,MODIS_Combined_Value_Added_AOD&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/PIA23781/PIA23781~small.jpg',
        gibsLayer: 'MODIS_Combined_Value_Added_AOD',
        missionInstrument: 'NASA Terra MODIS & Suomi-NPP OMPS',
        credit: 'NASA Earth Information Center / Goddard Space Flight Center',
        sourceUrl: 'https://worldview.earthdata.nasa.gov/?l=MODIS_Combined_Value_Added_AOD,MODIS_Terra_CorrectedReflectance_TrueColor&t=2023-06-15-T00%3A00%3A00Z',
        caption:
          'June 2023 satellite composite showing trans-Atlantic transport of record Canadian boreal wildfire smoke aerosols alongside rising atmospheric CO2 (>421 ppm).',
        colorScaleLabel: 'Aerosol Optical Depth (550 nm)',
        colorScaleGradient: 'linear-gradient(90deg, #ffffcc 0%, #fed976 30%, #fd8d3c 60%, #e31a1c 85%, #800026 100%)',
        colorScaleMin: '0.05',
        colorScaleMax: '1.50+'
      },
      {
        id: 'atmo-frame-4',
        title: 'OCO-2 Decade of Spaceborne Carbon Monitoring (2024)',
        dateLabel: 'May 2024 — 424.6 ppm Boreal Spring Peak',
        isoDate: '2024-05-15',
        imageUrl:
          'https://images-assets.nasa.gov/image/PIA23781/PIA23781~small.jpg',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/PIA20039/PIA20039~small.jpg',
        gibsLayer: 'OCO2_XCO2_Peak',
        missionInstrument: 'NASA OCO-2 & OCO-3 (ISS)',
        credit: 'NASA JPL / Caltech (PIA23781)',
        sourceUrl: 'https://images.nasa.gov/details/PIA23781',
        caption:
          'Ten years after OCO-2 launch, column-averaged carbon dioxide crossed 424 ppm during the May 2024 Northern Hemisphere seasonal maximum.',
        colorScaleLabel: 'Column XCO2 Concentration (ppm)',
        colorScaleGradient: 'linear-gradient(90deg, #1d4ed8 0%, #06b6d4 28%, #fde047 60%, #f97316 82%, #dc2626 100%)',
        colorScaleMin: '395 ppm',
        colorScaleMax: '426 ppm'
      }
    ],
    // Published OCO-2 Era Semiannual Series (Spring Maximum vs. Autumn Drawdown Minimum, 2014–2024):
    // primaryValue = Column XCO2 (ppm), secondaryValue = Tropospheric Zonal Wind Index (m/s), tertiaryValue = Global Mean MODIS AOD (550nm)
    referenceSeries: [
      { index: 0, dateLabel: '2014-Sep', isoDate: '2014-09-15', primaryValue: 396.8, secondaryValue: 6.2, tertiaryValue: 0.13, annotation: 'OCO-2 First Light Boreal Autumn Trough (396.8 ppm)' },
      { index: 1, dateLabel: '2015-May', isoDate: '2015-05-15', primaryValue: 401.2, secondaryValue: 8.1, tertiaryValue: 0.15, annotation: 'Spring Peak Before Summer Biosphere Drawdown (401.2 ppm)' },
      { index: 2, dateLabel: '2015-Sep', isoDate: '2015-09-15', primaryValue: 398.9, secondaryValue: 6.4, tertiaryValue: 0.18, annotation: '2015 Indonesian Peatland Fire Aerosol Surge (AOD 0.18)' },
      { index: 3, dateLabel: '2016-May', isoDate: '2016-05-15', primaryValue: 404.5, secondaryValue: 8.4, tertiaryValue: 0.15, annotation: 'El Niño Drought Weakens Terrestrial Carbon Sink (404.5 ppm)' },
      { index: 4, dateLabel: '2016-Sep', isoDate: '2016-09-15', primaryValue: 402.1, secondaryValue: 6.5, tertiaryValue: 0.14 },
      { index: 5, dateLabel: '2017-May', isoDate: '2017-05-15', primaryValue: 406.9, secondaryValue: 8.2, tertiaryValue: 0.15 },
      { index: 6, dateLabel: '2017-Sep', isoDate: '2017-09-15', primaryValue: 404.3, secondaryValue: 6.6, tertiaryValue: 0.17, annotation: '2017 Pacific Northwest & British Columbia Megafires' },
      { index: 7, dateLabel: '2018-May', isoDate: '2018-05-15', primaryValue: 409.2, secondaryValue: 8.3, tertiaryValue: 0.15 },
      { index: 8, dateLabel: '2018-Sep', isoDate: '2018-09-15', primaryValue: 406.6, secondaryValue: 6.4, tertiaryValue: 0.16 },
      { index: 9, dateLabel: '2019-May', isoDate: '2019-05-15', primaryValue: 411.8, secondaryValue: 8.5, tertiaryValue: 0.15, annotation: 'OCO-3 Joins OCO-2 from the International Space Station' },
      { index: 10, dateLabel: '2019-Sep', isoDate: '2019-09-15', primaryValue: 409.1, secondaryValue: 6.7, tertiaryValue: 0.19, annotation: '2019 Siberian & Amazonian Wildfire Plumes' },
      { index: 11, dateLabel: '2020-May', isoDate: '2020-05-15', primaryValue: 414.2, secondaryValue: 8.6, tertiaryValue: 0.21, annotation: 'Australian "Black Summer" Stratospheric Smoke Plume (AOD 0.21)' },
      { index: 12, dateLabel: '2020-Sep', isoDate: '2020-09-15', primaryValue: 411.5, secondaryValue: 6.8, tertiaryValue: 0.22, annotation: 'August–Sept 2020 US West Coast Fire Complex (AOD 0.22)' },
      { index: 13, dateLabel: '2021-May', isoDate: '2021-05-15', primaryValue: 416.5, secondaryValue: 8.7, tertiaryValue: 0.16 },
      { index: 14, dateLabel: '2021-Sep', isoDate: '2021-09-15', primaryValue: 413.8, secondaryValue: 6.9, tertiaryValue: 0.19, annotation: '2021 Boreal Taiga Smoke Transport' },
      { index: 15, dateLabel: '2022-May', isoDate: '2022-05-15', primaryValue: 418.8, secondaryValue: 8.8, tertiaryValue: 0.18, annotation: 'Hunga Tonga-Hunga Haʻapai Stratospheric Plume Year' },
      { index: 16, dateLabel: '2022-Sep', isoDate: '2022-09-15', primaryValue: 416.1, secondaryValue: 6.7, tertiaryValue: 0.16 },
      { index: 17, dateLabel: '2023-Jan', isoDate: '2023-01-15', primaryValue: 419.4, secondaryValue: 8.9, tertiaryValue: 0.15 },
      { index: 18, dateLabel: '2023-May', isoDate: '2023-05-15', primaryValue: 421.3, secondaryValue: 9.1, tertiaryValue: 0.20, annotation: 'First Spring Peak Above 420 ppm (421.3 ppm)' },
      { index: 19, dateLabel: '2023-Jul', isoDate: '2023-06-15', primaryValue: 419.8, secondaryValue: 7.5, tertiaryValue: 0.24, annotation: 'Record Canadian Boreal Wildfire Aerosol Event (AOD 0.24)' },
      { index: 20, dateLabel: '2023-Sep', isoDate: '2023-09-15', primaryValue: 418.5, secondaryValue: 6.8, tertiaryValue: 0.18 },
      { index: 21, dateLabel: '2024-Jan', isoDate: '2024-01-15', primaryValue: 422.1, secondaryValue: 9.2, tertiaryValue: 0.16 },
      { index: 22, dateLabel: '2024-May', isoDate: '2024-05-15', primaryValue: 424.6, secondaryValue: 9.4, tertiaryValue: 0.17, annotation: '2024 Record Spring XCO2 Maximum (424.6 ppm)' },
      { index: 23, dateLabel: '2024-Sep', isoDate: '2024-09-15', primaryValue: 422.0, secondaryValue: 7.1, tertiaryValue: 0.18, annotation: '2024 Autumn Trough Remains Above 422 ppm' }
    ],
    comparisonBaselineTitle: 'AIRS Early-2000s Carbon Column Baseline (2003–2013)',
    comparisonBaselineSeries: [
      { index: 0, dateLabel: '2003-Sep', isoDate: '2003-09-15', primaryValue: 374.2, secondaryValue: 6.0, tertiaryValue: 0.13 },
      { index: 1, dateLabel: '2004-May', isoDate: '2004-05-15', primaryValue: 378.4, secondaryValue: 7.8, tertiaryValue: 0.14 },
      { index: 2, dateLabel: '2004-Sep', isoDate: '2004-09-15', primaryValue: 375.9, secondaryValue: 6.1, tertiaryValue: 0.13 },
      { index: 3, dateLabel: '2005-May', isoDate: '2005-05-15', primaryValue: 380.6, secondaryValue: 7.9, tertiaryValue: 0.14 },
      { index: 4, dateLabel: '2005-Sep', isoDate: '2005-09-15', primaryValue: 378.1, secondaryValue: 6.2, tertiaryValue: 0.14 },
      { index: 5, dateLabel: '2006-May', isoDate: '2006-05-15', primaryValue: 382.7, secondaryValue: 8.0, tertiaryValue: 0.15 },
      { index: 6, dateLabel: '2006-Sep', isoDate: '2006-09-15', primaryValue: 380.1, secondaryValue: 6.1, tertiaryValue: 0.14 },
      { index: 7, dateLabel: '2007-May', isoDate: '2007-05-15', primaryValue: 384.6, secondaryValue: 8.0, tertiaryValue: 0.14 },
      { index: 8, dateLabel: '2007-Sep', isoDate: '2007-09-15', primaryValue: 382.0, secondaryValue: 6.2, tertiaryValue: 0.13 },
      { index: 9, dateLabel: '2008-May', isoDate: '2008-05-15', primaryValue: 386.5, secondaryValue: 8.1, tertiaryValue: 0.14 },
      { index: 10, dateLabel: '2008-Sep', isoDate: '2008-09-15', primaryValue: 383.9, secondaryValue: 6.3, tertiaryValue: 0.14 },
      { index: 11, dateLabel: '2009-May', isoDate: '2009-05-15', primaryValue: 388.2, secondaryValue: 8.0, tertiaryValue: 0.13 },
      { index: 12, dateLabel: '2009-Sep', isoDate: '2009-09-15', primaryValue: 385.7, secondaryValue: 6.2, tertiaryValue: 0.14 },
      { index: 13, dateLabel: '2010-May', isoDate: '2010-05-15', primaryValue: 390.8, secondaryValue: 8.2, tertiaryValue: 0.15 },
      { index: 14, dateLabel: '2010-Sep', isoDate: '2010-09-15', primaryValue: 388.1, secondaryValue: 6.4, tertiaryValue: 0.16 },
      { index: 15, dateLabel: '2011-May', isoDate: '2011-05-15', primaryValue: 392.6, secondaryValue: 8.1, tertiaryValue: 0.14 },
      { index: 16, dateLabel: '2011-Sep', isoDate: '2011-09-15', primaryValue: 390.0, secondaryValue: 6.3, tertiaryValue: 0.14 },
      { index: 17, dateLabel: '2012-May', isoDate: '2012-05-15', primaryValue: 394.8, secondaryValue: 8.2, tertiaryValue: 0.15 },
      { index: 18, dateLabel: '2012-Sep', isoDate: '2012-09-15', primaryValue: 392.2, secondaryValue: 6.4, tertiaryValue: 0.15 },
      { index: 19, dateLabel: '2013-Jan', isoDate: '2013-01-15', primaryValue: 395.1, secondaryValue: 8.3, tertiaryValue: 0.14 },
      { index: 20, dateLabel: '2013-May', isoDate: '2013-05-15', primaryValue: 397.2, secondaryValue: 8.4, tertiaryValue: 0.15 },
      { index: 21, dateLabel: '2013-Jul', isoDate: '2013-07-15', primaryValue: 395.6, secondaryValue: 7.0, tertiaryValue: 0.15 },
      { index: 22, dateLabel: '2013-Sep', isoDate: '2013-09-15', primaryValue: 394.3, secondaryValue: 6.4, tertiaryValue: 0.14 },
      { index: 23, dateLabel: '2014-Jan', isoDate: '2014-01-15', primaryValue: 397.5, secondaryValue: 8.4, tertiaryValue: 0.14 }
    ],
    observatorySites: [
      { id: 'mauna-loa-co2', name: 'Mauna Loa Atmospheric Baseline', region: 'Hawaii, USA (19.5°N, 155.6°W)', latitude: 19.536, longitude: -155.576, description: 'Global benchmark site for well-mixed Northern Hemisphere tropospheric air.' },
      { id: 'lauder', name: 'Lauder TCCON Validation Site', region: 'South Island, New Zealand (45.0°S, 169.7°E)', latitude: -45.038, longitude: 169.684, description: 'Primary Southern Hemisphere OCO-2 Total Carbon Column Observing Network validation station.' },
      { id: 'lamont', name: 'Lamont SGP Atmospheric Facility', region: 'Oklahoma, USA (36.6°N, 97.5°W)', latitude: 36.605, longitude: -97.486, description: 'Continental mid-latitude carbon flux and aerosol sounding super-site.' }
    ]
  }
};
