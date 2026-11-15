import {
  type ExperienceId,
  type ExperienceMeta,
  type MappingResponse,
  type SourcesResponse,
  type VisualFrameResponse,
  ExperienceMetaSchema,
  MappingResponseSchema,
  SourcesResponseSchema,
  VisualFrameResponseSchema
} from '@earthsonic/shared';
import { GISTEMP_CSV_URL, GISTEMP_DOCUMENTED_RANGE } from './gistemp.js';
import {
  ATMOSPHERE_DOCUMENTED_RANGE,
  OCEAN_DOCUMENTED_RANGE,
  buildPowerApiUrl
} from './power.js';

export const EXPERIENCES_METADATA: Record<ExperienceId, ExperienceMeta> = {
  temperature: {
    id: 'temperature',
    title: 'The Warming Planet: Global Surface Temperature Anomaly',
    shortTitle: 'The Warming Planet',
    subtitle: 'NASA GISS GISTEMP v4 Global Land-Ocean Temperature Index (1950–2025)',
    themeColor: '#FFC66D',
    badgeText: 'GISTEMP v4 / AIRS / MODIS',
    variable: 'Global Land-Ocean Surface Temperature Anomaly (J-D Annual Mean)',
    unit: '°C',
    isRatioScale: false,
    observationPeriod: '1880–2025 (Default view: 1950–2025)',
    referencePeriod: '1951-1980',
    provider: 'NASA Goddard Institute for Space Studies (GISS)',
    sourceUrl: GISTEMP_CSV_URL,
    scientificOverview:
      'Higher pitch represents a higher temperature anomaly within the selected dataset’s scale (-0.50°C to +1.50°C relative to the 1951–1980 baseline average). Negative anomalies sound as calm low-register sine waves, while modern positive warming anomalies (+1.17°C to +1.28°C) shift pitch upward and increase harmonic brightness.'
  },
  ocean: {
    id: 'ocean',
    title: 'The Water Rhythm: Marine Precipitation & Ocean Thermal State',
    shortTitle: 'The Water Rhythm',
    subtitle: 'NASA POWER MERRA-2 Precipitation (PRECTOTCORR) & JPL GHRSST Ocean Frames',
    themeColor: '#52C7F5',
    badgeText: 'NASA POWER / GHRSST / MODIS-AQUA',
    variable: 'MERRA-2 Bias-Corrected Precipitation Rate (PRECTOTCORR)',
    unit: 'mm/day',
    isRatioScale: true,
    observationPeriod: '2022–2023 Monthly Sentinel Observations',
    provider: 'NASA Langley Research Center (LaRC) POWER Project & JPL PO.DAAC',
    sourceUrl: buildPowerApiUrl({ lat: 4.0, lon: -140.0, startYear: 2022, endYear: 2023 }),
    scientificOverview:
      'Precipitation intensity and ocean thermal state control pulse density and crystalline FM harmonic resonance. Higher precipitation values (mm/day) produce faster rhythmic pulses and deeper aquatic sub-bass.'
  },
  atmosphere: {
    id: 'atmosphere',
    title: 'The Living Atmosphere: Tropospheric Wind & Aerosols',
    shortTitle: 'The Living Atmosphere',
    subtitle: 'NASA POWER MERRA-2 10m Wind Speed (WS10M), Surface Pressure & OCO-2/MODIS Frames',
    themeColor: '#8A7CFF',
    badgeText: 'NASA POWER / OCO-2 / MODIS AOD',
    variable: 'MERRA-2 10-Meter Tropospheric Wind Speed (WS10M)',
    unit: 'm/s',
    isRatioScale: true,
    observationPeriod: '2022–2023 Monthly Sentinel Observations',
    provider: 'NASA Langley Research Center (LaRC) POWER Project & EOSDIS GIBS',
    sourceUrl: buildPowerApiUrl({ lat: 19.54, lon: -155.58, startYear: 2022, endYear: 2023 }),
    scientificOverview:
      'Tropospheric 10-meter wind speed (m/s) and barometric pressure variations drive spectral modulation speed, filter cutoff frequency, and atmospheric wind-resonator timbre.'
  }
};

export const VISUAL_FRAMES_BY_EXPERIENCE: Record<ExperienceId, VisualFrameResponse> = {
  temperature: {
    experienceId: 'temperature',
    frames: [
      {
        id: 'temp-frame-1',
        title: 'Global Surface Air Temperature (Aqua AIRS Day)',
        dateLabel: 'July 2004 — Early 2000s Reference',
        isoDate: '2004-07-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2004-07-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,AIRS_L3_Surface_Air_Temperature_Daily_Day&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000437/GSFC_20171208_Archive_e000437~thumb.jpg',
        gibsLayer: 'AIRS_L3_Surface_Air_Temperature_Daily_Day',
        missionInstrument: 'NASA Aqua Satellite / Atmospheric Infrared Sounder (AIRS)',
        credit: 'NASA Earth Information Center / EOSDIS GIBS Worldview',
        sourceUrl:
          'https://worldview.earthdata.nasa.gov/?l=AIRS_L3_Surface_Air_Temperature_Daily_Day,BlueMarble_NextGeneration&t=2004-07-15-T00%3A00%3A00Z',
        caption:
          'Aqua AIRS Level-3 Daytime Surface Air Temperature retrieval across the globe on July 15, 2004.',
        colorScaleLabel: 'Surface Air Temperature (°C)',
        colorScaleGradient:
          'linear-gradient(90deg, #313695 0%, #4575b4 25%, #ffffbf 55%, #f46d43 80%, #a50026 100%)',
        colorScaleMin: '-40°C',
        colorScaleMax: '+45°C'
      },
      {
        id: 'temp-frame-2',
        title: 'Super El Niño Land Surface Temperature (MODIS Terra)',
        dateLabel: 'July 2016 — First Year Above +1.0°C Anomaly',
        isoDate: '2016-07-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2016-07-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,MODIS_Terra_Land_Surface_Temp_Day&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/analyses-reveal-record-shattering-global-warm-temperatures-in-2015_24476162096_o/analyses-reveal-record-shattering-global-warm-temperatures-in-2015_24476162096_o~thumb.jpg',
        gibsLayer: 'MODIS_Terra_Land_Surface_Temp_Day',
        missionInstrument: 'NASA Terra Satellite / MODIS Land Surface Temperature',
        credit: 'NASA Earth Information Center / LP DAAC / GIBS',
        sourceUrl:
          'https://worldview.earthdata.nasa.gov/?l=MODIS_Terra_Land_Surface_Temp_Day,BlueMarble_NextGeneration&t=2016-07-15-T00%3A00%3A00Z',
        caption:
          'MODIS Terra daytime land skin temperature during July 2016 (+1.01°C GISTEMP anomaly).',
        colorScaleLabel: 'Land Skin Temperature (°C)',
        colorScaleGradient:
          'linear-gradient(90deg, #2b83ba 0%, #abdda4 30%, #ffffbf 55%, #fdae61 80%, #d7191c 100%)',
        colorScaleMin: '-25°C',
        colorScaleMax: '+60°C'
      },
      {
        id: 'temp-frame-3',
        title: '2023 Record Global Thermal Jump (Aqua AIRS)',
        dateLabel: 'July 2023 — +1.17°C Annual Anomaly',
        isoDate: '2023-07-01',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2023-07-01&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,AIRS_L3_Surface_Air_Temperature_Daily_Day&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000437/GSFC_20171208_Archive_e000437~thumb.jpg',
        gibsLayer: 'AIRS_L3_Surface_Air_Temperature_Daily_Day',
        missionInstrument: 'NASA Aqua AIRS & GISS GISTEMP v4',
        credit: 'NASA Goddard Institute for Space Studies (GISS) / EOSDIS GIBS',
        sourceUrl:
          'https://worldview.earthdata.nasa.gov/?l=AIRS_L3_Surface_Air_Temperature_Daily_Day,BlueMarble_NextGeneration&t=2023-07-01-T00%3A00%3A00Z',
        caption:
          'July 2023 marked the warmest month in NASA GISTEMP instrumental history.',
        colorScaleLabel: 'Surface Air Temperature (°C)',
        colorScaleGradient:
          'linear-gradient(90deg, #313695 0%, #4575b4 25%, #ffffbf 55%, #f46d43 80%, #a50026 100%)',
        colorScaleMin: '-40°C',
        colorScaleMax: '+48°C'
      },
      {
        id: 'temp-frame-4',
        title: '2024 Record Planetary Anomaly (+1.28°C)',
        dateLabel: 'July 2024 — +1.28°C GISTEMP Peak',
        isoDate: '2024-07-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2024-07-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,MODIS_Terra_Land_Surface_Temp_Day&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl:
          'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000437/GSFC_20171208_Archive_e000437~thumb.jpg',
        gibsLayer: 'MODIS_Terra_Land_Surface_Temp_Day',
        missionInstrument: 'NASA Terra MODIS & GISS GISTEMP v4',
        credit: 'NASA Goddard Institute for Space Studies (GISS)',
        sourceUrl: 'https://data.giss.nasa.gov/gistemp/',
        caption:
          '2024 full-globe thermal observation showing sustained record land-surface heating (+1.28°C above 1951–1980 baseline).',
        colorScaleLabel: 'Land Surface Temperature (°C)',
        colorScaleGradient:
          'linear-gradient(90deg, #313695 0%, #74add1 25%, #fee090 55%, #f46d43 80%, #a50026 100%)',
        colorScaleMin: '-25°C',
        colorScaleMax: '+60°C'
      }
    ]
  },
  ocean: {
    experienceId: 'ocean',
    frames: [
      {
        id: 'ocean-frame-1',
        title: 'Global Sea Surface Temperature (JPL GHRSST MUR L4)',
        dateLabel: 'July 2015 — Pacific Warm Pool & ITCZ',
        isoDate: '2015-07-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2015-07-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,GHRSST_L4_MUR_Sea_Surface_Temperature&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl: 'https://images-assets.nasa.gov/image/PIA18034/PIA18034~small.jpg',
        gibsLayer: 'GHRSST_L4_MUR_Sea_Surface_Temperature',
        missionInstrument: 'NASA JPL PO.DAAC / GHRSST Level-4 MUR',
        credit: 'NASA JPL Physical Oceanography DAAC / EOSDIS GIBS',
        sourceUrl:
          'https://worldview.earthdata.nasa.gov/?l=GHRSST_L4_MUR_Sea_Surface_Temperature,BlueMarble_NextGeneration&t=2015-07-15-T00%3A00%3A00Z',
        caption:
          'Multi-scale Ultra-high Resolution (MUR) Sea Surface Temperature showing the equatorial Pacific warm pool that fuels tropical precipitation.',
        colorScaleLabel: 'Sea Surface Temperature (°C)',
        colorScaleGradient:
          'linear-gradient(90deg, #081d58 0%, #225ea8 25%, #41b6c4 50%, #fed976 75%, #e31a1c 100%)',
        colorScaleMin: '-2°C',
        colorScaleMax: '+34°C'
      },
      {
        id: 'ocean-frame-2',
        title: 'Global Marine Phytoplankton Chlorophyll-a (MODIS Aqua)',
        dateLabel: 'July 2019 — Ocean Upwelling & Productivity',
        isoDate: '2019-07-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2019-07-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,MODIS_Aqua_Chlorophyll_A&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl: 'https://images-assets.nasa.gov/image/PIA18034/PIA18034~small.jpg',
        gibsLayer: 'MODIS_Aqua_Chlorophyll_A',
        missionInstrument: 'NASA Aqua Satellite / MODIS Ocean Color',
        credit: 'NASA Ocean Biology Processing Group (OBPG) / GSFC',
        sourceUrl:
          'https://worldview.earthdata.nasa.gov/?l=MODIS_Aqua_Chlorophyll_A,BlueMarble_NextGeneration&t=2019-07-15-T00%3A00%3A00Z',
        caption:
          'MODIS-Aqua near-surface Chlorophyll-a concentration (mg/m³) showing nutrient-rich equatorial upwelling.',
        colorScaleLabel: 'Chlorophyll-a (mg/m³)',
        colorScaleGradient:
          'linear-gradient(90deg, #0c2c84 0%, #1d91c0 30%, #7fcdbb 55%, #f7fcb9 80%, #d95f0e 100%)',
        colorScaleMin: '0.01 mg/m³',
        colorScaleMax: '20.0 mg/m³'
      },
      {
        id: 'ocean-frame-3',
        title: '2023 Global Marine Heatwave & Hydrological Surge',
        dateLabel: 'August 2023 — Record Ocean Heat',
        isoDate: '2023-08-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2023-08-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,GHRSST_L4_MUR_Sea_Surface_Temperature&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl: 'https://images-assets.nasa.gov/image/PIA18034/PIA18034~small.jpg',
        gibsLayer: 'GHRSST_L4_MUR_Sea_Surface_Temperature',
        missionInstrument: 'NASA JPL GHRSST MUR & MERRA-2 Hydrological Cycle',
        credit: 'NASA JPL PO.DAAC / Earth Information Center',
        sourceUrl:
          'https://worldview.earthdata.nasa.gov/?l=GHRSST_L4_MUR_Sea_Surface_Temperature,BlueMarble_NextGeneration&t=2023-08-15-T00%3A00%3A00Z',
        caption:
          'August 2023 global sea surface temperatures fueling intensified tropical convergence zone rainfall.',
        colorScaleLabel: 'Sea Surface Temperature (°C)',
        colorScaleGradient:
          'linear-gradient(90deg, #081d58 0%, #225ea8 25%, #41b6c4 50%, #fed976 75%, #e31a1c 100%)',
        colorScaleMin: '-2°C',
        colorScaleMax: '+34°C'
      }
    ]
  },
  atmosphere: {
    experienceId: 'atmosphere',
    frames: [
      {
        id: 'atmo-frame-1',
        title: 'Global Aerosol Optical Depth & Atmospheric Transport (MODIS)',
        dateLabel: 'August 2020 — Tropospheric Smoke & Dust Transport',
        isoDate: '2020-08-20',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2020-08-20&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor,MODIS_Combined_Value_Added_AOD&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl: 'https://images-assets.nasa.gov/image/PIA23781/PIA23781~small.jpg',
        gibsLayer: 'MODIS_Combined_Value_Added_AOD',
        missionInstrument: 'NASA Terra & Aqua MODIS Combined AOD (550 nm)',
        credit: 'NASA Earth Information Center / EOSDIS GIBS Worldview',
        sourceUrl:
          'https://worldview.earthdata.nasa.gov/?l=MODIS_Combined_Value_Added_AOD,MODIS_Terra_CorrectedReflectance_TrueColor&t=2020-08-20-T00%3A00%3A00Z',
        caption:
          'MODIS True Color + Value-Added Aerosol Optical Depth showing global wind-driven aerosol transport.',
        colorScaleLabel: 'Aerosol Optical Depth at 550 nm (τ)',
        colorScaleGradient:
          'linear-gradient(90deg, #ffffcc 0%, #fed976 30%, #fd8d3c 60%, #e31a1c 85%, #800026 100%)',
        colorScaleMin: '0.05',
        colorScaleMax: '1.50+'
      },
      {
        id: 'atmo-frame-2',
        title: 'June 2023 Boreal Smoke & Zonal Wind Transport',
        dateLabel: 'June 2023 — Trans-Atlantic Plume Transport',
        isoDate: '2023-06-15',
        imageUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2023-06-15&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor,MODIS_Combined_Value_Added_AOD&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        fallbackImageUrl: 'https://images-assets.nasa.gov/image/PIA23781/PIA23781~small.jpg',
        gibsLayer: 'MODIS_Combined_Value_Added_AOD',
        missionInstrument: 'NASA Terra MODIS & MERRA-2 Zonal Wind',
        credit: 'NASA Earth Information Center / Goddard Space Flight Center',
        sourceUrl:
          'https://worldview.earthdata.nasa.gov/?l=MODIS_Combined_Value_Added_AOD,MODIS_Terra_CorrectedReflectance_TrueColor&t=2023-06-15-T00%3A00%3A00Z',
        caption:
          'June 2023 satellite composite showing jet-stream and surface wind transport of Canadian wildfire smoke.',
        colorScaleLabel: 'Aerosol Optical Depth (550 nm)',
        colorScaleGradient:
          'linear-gradient(90deg, #ffffcc 0%, #fed976 30%, #fd8d3c 60%, #e31a1c 85%, #800026 100%)',
        colorScaleMin: '0.05',
        colorScaleMax: '1.50+'
      },
      {
        id: 'atmo-frame-3',
        title: 'NASA OCO-2 Global Carbon Dioxide Column',
        dateLabel: 'May 2024 — Northern Hemisphere Spring Maximum',
        isoDate: '2024-05-15',
        imageUrl: 'https://images-assets.nasa.gov/image/PIA23781/PIA23781~small.jpg',
        fallbackImageUrl: 'https://images-assets.nasa.gov/image/PIA18815/PIA18815~small.jpg',
        gibsLayer: 'OCO2_XCO2_Archive',
        missionInstrument: 'NASA Orbiting Carbon Observatory-2 (OCO-2)',
        credit: 'NASA JPL / Caltech (PIA23781)',
        sourceUrl: 'https://images.nasa.gov/details/PIA23781',
        caption:
          'OCO-2 spaceborne column-averaged dry-air carbon dioxide concentration redistributed by global atmospheric winds.',
        colorScaleLabel: 'Column XCO2 Concentration (ppm)',
        colorScaleGradient:
          'linear-gradient(90deg, #1d4ed8 0%, #06b6d4 28%, #fde047 60%, #f97316 82%, #dc2626 100%)',
        colorScaleMin: '395 ppm',
        colorScaleMax: '426 ppm'
      }
    ]
  }
};

export const MAPPINGS_BY_EXPERIENCE: Record<ExperienceId, MappingResponse> = {
  temperature: {
    experienceId: 'temperature',
    synthPresetName: 'Warm Analog Thermal Polysynth',
    synthDescription:
      'Dual-oscillator voice that transitions from pure low-register sine waves during negative temperature anomalies (< 0°C) to bright sawtooth/triangle chords during positive warming extremes.',
    howSoundIsCreatedPlainLanguage:
      'The original NASA GISTEMP temperature anomaly (°C relative to the 1951–1980 mean) is linearly normalized against [-0.50°C, +1.50°C] and mapped to the pitch of a synthesized tone in D Dorian (130.8 Hz to 587.3 Hz). Intra-annual monthly temperature spread controls rhythmic pulse tempo.',
    mappings: {
      pitch: {
        parameter: 'pitch',
        label: 'Harmonic Pitch (Frequency)',
        variableName: 'Global Land-Ocean Temp Anomaly',
        variableCode: 'GISTEMP_JD',
        unit: '°C vs 1951–1980',
        documentedRange: GISTEMP_DOCUMENTED_RANGE,
        audioRange: { min: 130.81, max: 587.33, unit: 'Hz' },
        curve: 'linear',
        formula: 'norm = clamp((T - (-0.50)) / 2.0, 0, 1); f = 130.81 × 2^(norm × 2.16)',
        explanation:
          'Higher pitch represents a higher temperature anomaly within the selected dataset’s scale. Negative anomalies (< 0°C) use calm sine tones; positive anomalies add warm sawtooth overtones.'
      },
      rhythm: {
        parameter: 'rhythm',
        label: 'Rhythmic Pulse Density (Tempo)',
        variableName: 'Intra-Annual Monthly Thermal Spread',
        variableCode: 'GISTEMP_SPREAD',
        unit: '°C spread index',
        documentedRange: {
          min: 8.0,
          max: 14.5,
          basis: 'Derived from max(Jan..Dec) - min(Jan..Dec) monthly anomaly spread.'
        },
        audioRange: { min: 68, max: 148, unit: 'BPM' },
        curve: 'linear',
        formula: 'BPM = 68 + clamp((S - 8.0) / 6.5, 0, 1) × 80',
        explanation:
          'Years with wider seasonal temperature swings between winter and summer produce a faster rhythmic pulse.'
      },
      intensity: {
        parameter: 'intensity',
        label: 'Sound Intensity & Low-Pass Filter Cutoff',
        variableName: 'Thermal Accumulation Index',
        variableCode: 'THERMAL_INDEX',
        unit: 'index',
        documentedRange: {
          min: 0.2,
          max: 1.4,
          basis: 'Normalized thermal energy index proportional to positive warming anomaly.'
        },
        audioRange: { min: -18, max: -2, unit: 'dBFS' },
        curve: 'linear',
        formula: 'Gain = -18 + norm × 16 dBFS; Filter Cutoff = 360 to 3400 Hz',
        explanation:
          'Higher warming anomalies open the resonant low-pass filter and increase acoustic intensity.'
      }
    }
  },
  ocean: {
    experienceId: 'ocean',
    synthPresetName: 'Crystalline Marine FM Pluck & Sub-Wave',
    synthDescription:
      '2-operator Frequency Modulation (FM) bell/marimba pluck layered with a deep oceanic sub-bass sine wave.',
    howSoundIsCreatedPlainLanguage:
      'Monthly NASA POWER bias-corrected precipitation (PRECTOTCORR in mm/day) is linearly normalized against [0.0, 14.0 mm/day] to control both the A-Minor Pentatonic pitch and the density of rhythmic water pulses (68–148 BPM).',
    mappings: {
      pitch: {
        parameter: 'pitch',
        label: 'Harmonic Pitch & Pulse Trigger',
        variableName: 'Bias-Corrected Precipitation Rate',
        variableCode: 'PRECTOTCORR',
        unit: 'mm/day',
        documentedRange: OCEAN_DOCUMENTED_RANGE,
        audioRange: { min: 146.83, max: 523.25, unit: 'Hz' },
        curve: 'linear',
        formula: 'norm = clamp(P / 14.0, 0, 1); f = 146.83 × 2^(norm × 1.83)',
        explanation:
          'Dry months sound in deep, sparse aquatic registers while intense tropical convergence zone rainfall shifts pitch higher and triggers denser water pulses.'
      },
      rhythm: {
        parameter: 'rhythm',
        label: 'Pulse Density & Surface Wind Coupling',
        variableName: 'Surface Wind Speed (10m)',
        variableCode: 'WS10M',
        unit: 'm/s',
        documentedRange: {
          min: 2.0,
          max: 12.0,
          basis: 'Documented marine surface wind speed range (m/s) from NASA POWER MERRA-2.'
        },
        audioRange: { min: 68, max: 146, unit: 'BPM' },
        curve: 'linear',
        formula: 'BPM = 68 + clamp((W - 2.0) / 10.0, 0, 1) × 78',
        explanation:
          'Stronger marine trade winds accelerate the rhythmic pulse tempo.'
      },
      intensity: {
        parameter: 'intensity',
        label: 'Acoustic Depth & FM Modulation Index',
        variableName: 'Marine 2m Air Temperature',
        variableCode: 'T2M',
        unit: '°C',
        documentedRange: {
          min: 18.0,
          max: 30.0,
          basis: 'Tropical/subtropical marine boundary layer temperature range (°C).'
        },
        audioRange: { min: -18, max: -2, unit: 'dBFS' },
        curve: 'linear',
        formula: 'Gain = -18 + clamp((T2M - 18) / 12, 0, 1) × 16 dBFS',
        explanation:
          'Warmer marine air and sea surface temperatures enrich the FM harmonic shimmer.'
      }
    }
  },
  atmosphere: {
    experienceId: 'atmosphere',
    synthPresetName: 'Ethereal Spectral Pad & Wind Resonator',
    synthDescription:
      'Detuned E-Lydian harmonic choir pad paired with a pink-noise bandpass wind resonator driven by atmospheric circulation.',
    howSoundIsCreatedPlainLanguage:
      'Monthly NASA POWER 10-meter wind speed (WS10M in m/s) is normalized against [2.0, 14.0 m/s] to control harmonic pitch, modulation speed, and the bandpass-filtered atmospheric wind texture.',
    mappings: {
      pitch: {
        parameter: 'pitch',
        label: 'Harmonic Pitch & Modulation Speed',
        variableName: '10-Meter Tropospheric Wind Speed',
        variableCode: 'WS10M',
        unit: 'm/s',
        documentedRange: ATMOSPHERE_DOCUMENTED_RANGE,
        audioRange: { min: 164.81, max: 587.33, unit: 'Hz' },
        curve: 'linear',
        formula: 'norm = clamp((W - 2.0) / 12.0, 0, 1); f = 164.81 × 2^(norm × 1.83)',
        explanation:
          'Calm wind periods produce low, steady harmonic pads; stronger winter/spring jet and trade wind speeds elevate pitch and modulation speed.'
      },
      rhythm: {
        parameter: 'rhythm',
        label: 'Atmospheric Pulse Tempo',
        variableName: 'Diurnal Temperature Range',
        variableCode: 'T2M_RANGE',
        unit: '°C',
        documentedRange: {
          min: 3.0,
          max: 14.0,
          basis: 'Monthly diurnal temperature range (°C) from NASA POWER MERRA-2.'
        },
        audioRange: { min: 66, max: 138, unit: 'BPM' },
        curve: 'linear',
        formula: 'BPM = 66 + clamp((R - 3.0) / 11.0, 0, 1) × 72',
        explanation:
          'Larger diurnal thermal swings speed up the atmospheric pulse rate.'
      },
      intensity: {
        parameter: 'intensity',
        label: 'Spectral Filter Cutoff & Resonance',
        variableName: 'Surface Barometric Pressure',
        variableCode: 'PS',
        unit: 'kPa',
        documentedRange: {
          min: 65.0,
          max: 103.0,
          basis: 'Surface pressure range from mountain observatories (Mauna Loa ~68 kPa) to sea level (~101.3 kPa).'
        },
        audioRange: { min: -16, max: -2, unit: 'dBFS' },
        curve: 'linear',
        formula: 'Gain = -16 + clamp((PS - 65) / 38, 0, 1) × 14 dBFS',
        explanation:
          'Barometric pressure variations modulate the bandpass filter cutoff and wind breath intensity.'
      }
    }
  }
};

export function getExperiencesMeta(): ExperienceMeta[] {
  return Object.values(EXPERIENCES_METADATA).map((m) => ExperienceMetaSchema.parse(m));
}

export function getExperienceMetaById(id: ExperienceId): ExperienceMeta {
  return ExperienceMetaSchema.parse(EXPERIENCES_METADATA[id]);
}

export function getExperienceFrames(id: ExperienceId): VisualFrameResponse {
  return VisualFrameResponseSchema.parse(VISUAL_FRAMES_BY_EXPERIENCE[id]);
}

export function getExperienceMapping(id: ExperienceId): MappingResponse {
  return MappingResponseSchema.parse(MAPPINGS_BY_EXPERIENCE[id]);
}

export function getAllSourcesDocumentation(): SourcesResponse {
  const payload: SourcesResponse = {
    sources: [
      {
        id: 'nasa-gistemp-v4',
        experienceId: 'temperature',
        name: 'GISS Surface Temperature Analysis (GISTEMP v4) — Global Land-Ocean Temperature Index',
        provider: 'NASA Goddard Institute for Space Studies (GISS)',
        sourceUrl: GISTEMP_CSV_URL,
        variable: 'J-D Annual & Monthly Mean Surface Temperature Anomaly',
        unit: '°C (relative to 1951–1980 base period)',
        observationPeriod: '1880–2026',
        referencePeriod: '1951-1980',
        processing: [
          'Fetched live CSV from https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv',
          'Converted "***" missing-value markers to JSON null (never 0)',
          'Linearly normalized anomalies against [-0.50°C, +1.50°C] into [0, 1]'
        ],
        creativeMappingSummary:
          'Normalized anomaly drives D-Dorian oscillator pitch (130.8–587.3 Hz). Negative anomalies use pure sine waves; positive anomalies introduce sawtooth harmonics.'
      },
      {
        id: 'nasa-power-merra2-water',
        experienceId: 'ocean',
        name: 'NASA Langley POWER API — MERRA-2 Bias-Corrected Precipitation (PRECTOTCORR)',
        provider: 'NASA Langley Research Center (LaRC) POWER Project & GMAO MERRA-2',
        sourceUrl: buildPowerApiUrl({ lat: 4.0, lon: -140.0, startYear: 2022, endYear: 2023 }),
        variable: 'PRECTOTCORR (Precipitation), WS10M (10m Wind), T2M (2m Temperature)',
        unit: 'mm/day, m/s, °C',
        observationPeriod: '2022–2023 Monthly Series',
        processing: [
          'Fetched JSON from https://power.larc.nasa.gov/api/temporal/monthly/point',
          'Converted -999 fill markers to JSON null (never 0)',
          'Linearly normalized PRECTOTCORR against [0.0, 14.0 mm/day] into [0, 1]'
        ],
        creativeMappingSummary:
          'Precipitation rate controls A-Minor Pentatonic FM bell pitch and pulse density (68–146 BPM).'
      },
      {
        id: 'nasa-power-merra2-atmosphere',
        experienceId: 'atmosphere',
        name: 'NASA Langley POWER API — MERRA-2 Tropospheric Wind & Atmospheric State',
        provider: 'NASA Langley Research Center (LaRC) POWER Project & GMAO MERRA-2',
        sourceUrl: buildPowerApiUrl({ lat: 19.54, lon: -155.58, startYear: 2022, endYear: 2023 }),
        variable: 'WS10M (10m Wind Speed), T2M_RANGE (Diurnal Thermal Range), PS (Surface Pressure)',
        unit: 'm/s, °C, kPa',
        observationPeriod: '2022–2023 Monthly Series',
        processing: [
          'Fetched JSON from https://power.larc.nasa.gov/api/temporal/monthly/point',
          'Converted -999 fill markers to JSON null (never 0)',
          'Linearly normalized WS10M against [2.0, 14.0 m/s] into [0, 1]'
        ],
        creativeMappingSummary:
          'Wind speed controls E-Lydian spectral choir pitch, LFO modulation rate, and bandpass-filtered pink noise wind resonance.'
      },
      {
        id: 'nasa-gibs-worldview',
        experienceId: 'temperature',
        name: 'NASA EOSDIS Global Imagery Browse Services (GIBS) & Worldview Snapshots',
        provider: 'NASA Earth Information Center / EOSDIS GIBS',
        sourceUrl:
          'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=2023-07-01&BBOX=-90,-180,90,180&CRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration,AIRS_L3_Surface_Air_Temperature_Daily_Day&FORMAT=image/jpeg&WIDTH=1200&HEIGHT=600',
        variable: 'Satellite Visual Frames (AIRS Surface Temp, MODIS Land Temp, GHRSST MUR SST, MODIS Chlorophyll-a, MODIS AOD)',
        unit: 'JPEG / PNG Visual Frames',
        observationPeriod: '2004–2024',
        processing: [
          'Paired authentic NASA Worldview / GIBS WMS snapshots and NASA Image Library assets with synchronized timeline keyframes'
        ],
        creativeMappingSummary:
          'Visual frames synchronize automatically with the active sonification playhead step.'
      }
    ],
    disclaimer:
      'EarthSonic is an independent educational project created for NASA Space Apps Challenge 2026. It is not an official NASA product. NASA data and visualizations remain the property of their respective owners and are credited to their sources.'
  };

  return SourcesResponseSchema.parse(payload);
}
