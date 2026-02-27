import { FilingStatus, State } from 'ustaxes/core/data'
import { TaxBracket } from 'ustaxes/core/stateForms/stateBrackets'

export type BracketsByStatus = { [K in FilingStatus]: TaxBracket[] }

export const progressiveStateBrackets: Partial<Record<State, BracketsByStatus>> = {
  AL: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.02 }, { threshold: 500, rate: 0.04 }, { threshold: 3000, rate: 0.05 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.02 }, { threshold: 1000, rate: 0.04 }, { threshold: 6000, rate: 0.05 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.02 }, { threshold: 500, rate: 0.04 }, { threshold: 3000, rate: 0.05 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.02 }, { threshold: 500, rate: 0.04 }, { threshold: 3000, rate: 0.05 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.02 }, { threshold: 1000, rate: 0.04 }, { threshold: 6000, rate: 0.05 }]
  },
  AR: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.02 }, { threshold: 4300, rate: 0.04 }, { threshold: 8500, rate: 0.055 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.02 }, { threshold: 4300, rate: 0.04 }, { threshold: 8500, rate: 0.055 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.02 }, { threshold: 4300, rate: 0.04 }, { threshold: 8500, rate: 0.055 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.02 }, { threshold: 4300, rate: 0.04 }, { threshold: 8500, rate: 0.055 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.02 }, { threshold: 4300, rate: 0.04 }, { threshold: 8500, rate: 0.055 }]
  },
  AZ: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.0259 }, { threshold: 27808, rate: 0.0334 }, { threshold: 55615, rate: 0.0417 }, { threshold: 166843, rate: 0.045 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.0259 }, { threshold: 55615, rate: 0.0334 }, { threshold: 111229, rate: 0.0417 }, { threshold: 333684, rate: 0.045 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.0259 }, { threshold: 27808, rate: 0.0334 }, { threshold: 55615, rate: 0.0417 }, { threshold: 166843, rate: 0.045 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.0259 }, { threshold: 27808, rate: 0.0334 }, { threshold: 55615, rate: 0.0417 }, { threshold: 166843, rate: 0.045 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.0259 }, { threshold: 55615, rate: 0.0334 }, { threshold: 111229, rate: 0.0417 }, { threshold: 333684, rate: 0.045 }]
  },
  CT: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.03 }, { threshold: 10000, rate: 0.05 }, { threshold: 50000, rate: 0.055 }, { threshold: 100000, rate: 0.06 }, { threshold: 200000, rate: 0.065 }, { threshold: 250000, rate: 0.069 }, { threshold: 500000, rate: 0.0699 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.03 }, { threshold: 20000, rate: 0.05 }, { threshold: 100000, rate: 0.055 }, { threshold: 200000, rate: 0.06 }, { threshold: 400000, rate: 0.065 }, { threshold: 500000, rate: 0.069 }, { threshold: 1000000, rate: 0.0699 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.03 }, { threshold: 10000, rate: 0.05 }, { threshold: 50000, rate: 0.055 }, { threshold: 100000, rate: 0.06 }, { threshold: 200000, rate: 0.065 }, { threshold: 250000, rate: 0.069 }, { threshold: 500000, rate: 0.0699 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.03 }, { threshold: 10000, rate: 0.05 }, { threshold: 50000, rate: 0.055 }, { threshold: 100000, rate: 0.06 }, { threshold: 200000, rate: 0.065 }, { threshold: 250000, rate: 0.069 }, { threshold: 500000, rate: 0.0699 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.03 }, { threshold: 20000, rate: 0.05 }, { threshold: 100000, rate: 0.055 }, { threshold: 200000, rate: 0.06 }, { threshold: 400000, rate: 0.065 }, { threshold: 500000, rate: 0.069 }, { threshold: 1000000, rate: 0.0699 }]
  },
  DC: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.04 }, { threshold: 10000, rate: 0.06 }, { threshold: 40000, rate: 0.065 }, { threshold: 60000, rate: 0.085 }, { threshold: 250000, rate: 0.0925 }, { threshold: 500000, rate: 0.0975 }, { threshold: 1000000, rate: 0.1075 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.04 }, { threshold: 10000, rate: 0.06 }, { threshold: 40000, rate: 0.065 }, { threshold: 60000, rate: 0.085 }, { threshold: 250000, rate: 0.0925 }, { threshold: 500000, rate: 0.0975 }, { threshold: 1000000, rate: 0.1075 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.04 }, { threshold: 10000, rate: 0.06 }, { threshold: 40000, rate: 0.065 }, { threshold: 60000, rate: 0.085 }, { threshold: 250000, rate: 0.0925 }, { threshold: 500000, rate: 0.0975 }, { threshold: 1000000, rate: 0.1075 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.04 }, { threshold: 10000, rate: 0.06 }, { threshold: 40000, rate: 0.065 }, { threshold: 60000, rate: 0.085 }, { threshold: 250000, rate: 0.0925 }, { threshold: 500000, rate: 0.0975 }, { threshold: 1000000, rate: 0.1075 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.04 }, { threshold: 10000, rate: 0.06 }, { threshold: 40000, rate: 0.065 }, { threshold: 60000, rate: 0.085 }, { threshold: 250000, rate: 0.0925 }, { threshold: 500000, rate: 0.0975 }, { threshold: 1000000, rate: 0.1075 }]
  },
  DE: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.022 }, { threshold: 5000, rate: 0.039 }, { threshold: 10000, rate: 0.048 }, { threshold: 20000, rate: 0.052 }, { threshold: 25000, rate: 0.0555 }, { threshold: 60000, rate: 0.066 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.022 }, { threshold: 5000, rate: 0.039 }, { threshold: 10000, rate: 0.048 }, { threshold: 20000, rate: 0.052 }, { threshold: 25000, rate: 0.0555 }, { threshold: 60000, rate: 0.066 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.022 }, { threshold: 5000, rate: 0.039 }, { threshold: 10000, rate: 0.048 }, { threshold: 20000, rate: 0.052 }, { threshold: 25000, rate: 0.0555 }, { threshold: 60000, rate: 0.066 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.022 }, { threshold: 5000, rate: 0.039 }, { threshold: 10000, rate: 0.048 }, { threshold: 20000, rate: 0.052 }, { threshold: 25000, rate: 0.0555 }, { threshold: 60000, rate: 0.066 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.022 }, { threshold: 5000, rate: 0.039 }, { threshold: 10000, rate: 0.048 }, { threshold: 20000, rate: 0.052 }, { threshold: 25000, rate: 0.0555 }, { threshold: 60000, rate: 0.066 }]
  },
  HI: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.014 }, { threshold: 2400, rate: 0.032 }, { threshold: 4800, rate: 0.055 }, { threshold: 9600, rate: 0.064 }, { threshold: 14400, rate: 0.068 }, { threshold: 19200, rate: 0.072 }, { threshold: 24000, rate: 0.076 }, { threshold: 36000, rate: 0.079 }, { threshold: 48000, rate: 0.0825 }, { threshold: 150000, rate: 0.09 }, { threshold: 175000, rate: 0.1 }, { threshold: 200000, rate: 0.11 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.014 }, { threshold: 4800, rate: 0.032 }, { threshold: 9600, rate: 0.055 }, { threshold: 19200, rate: 0.064 }, { threshold: 28800, rate: 0.068 }, { threshold: 38400, rate: 0.072 }, { threshold: 48000, rate: 0.076 }, { threshold: 72000, rate: 0.079 }, { threshold: 96000, rate: 0.0825 }, { threshold: 300000, rate: 0.09 }, { threshold: 350000, rate: 0.1 }, { threshold: 400000, rate: 0.11 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.014 }, { threshold: 2400, rate: 0.032 }, { threshold: 4800, rate: 0.055 }, { threshold: 9600, rate: 0.064 }, { threshold: 14400, rate: 0.068 }, { threshold: 19200, rate: 0.072 }, { threshold: 24000, rate: 0.076 }, { threshold: 36000, rate: 0.079 }, { threshold: 48000, rate: 0.0825 }, { threshold: 150000, rate: 0.09 }, { threshold: 175000, rate: 0.1 }, { threshold: 200000, rate: 0.11 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.014 }, { threshold: 2400, rate: 0.032 }, { threshold: 4800, rate: 0.055 }, { threshold: 9600, rate: 0.064 }, { threshold: 14400, rate: 0.068 }, { threshold: 19200, rate: 0.072 }, { threshold: 24000, rate: 0.076 }, { threshold: 36000, rate: 0.079 }, { threshold: 48000, rate: 0.0825 }, { threshold: 150000, rate: 0.09 }, { threshold: 175000, rate: 0.1 }, { threshold: 200000, rate: 0.11 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.014 }, { threshold: 4800, rate: 0.032 }, { threshold: 9600, rate: 0.055 }, { threshold: 19200, rate: 0.064 }, { threshold: 28800, rate: 0.068 }, { threshold: 38400, rate: 0.072 }, { threshold: 48000, rate: 0.076 }, { threshold: 72000, rate: 0.079 }, { threshold: 96000, rate: 0.0825 }, { threshold: 300000, rate: 0.09 }, { threshold: 350000, rate: 0.1 }, { threshold: 400000, rate: 0.11 }]
  },
  IA: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.0033 }, { threshold: 1743, rate: 0.0067 }, { threshold: 3486, rate: 0.0225 }, { threshold: 6972, rate: 0.0414 }, { threshold: 15687, rate: 0.0563 }, { threshold: 26145, rate: 0.0596 }, { threshold: 34860, rate: 0.0625 }, { threshold: 52290, rate: 0.0744 }, { threshold: 78435, rate: 0.0853 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.0033 }, { threshold: 1743, rate: 0.0067 }, { threshold: 3486, rate: 0.0225 }, { threshold: 6972, rate: 0.0414 }, { threshold: 15687, rate: 0.0563 }, { threshold: 26145, rate: 0.0596 }, { threshold: 34860, rate: 0.0625 }, { threshold: 52290, rate: 0.0744 }, { threshold: 78435, rate: 0.0853 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.0033 }, { threshold: 1743, rate: 0.0067 }, { threshold: 3486, rate: 0.0225 }, { threshold: 6972, rate: 0.0414 }, { threshold: 15687, rate: 0.0563 }, { threshold: 26145, rate: 0.0596 }, { threshold: 34860, rate: 0.0625 }, { threshold: 52290, rate: 0.0744 }, { threshold: 78435, rate: 0.0853 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.0033 }, { threshold: 1743, rate: 0.0067 }, { threshold: 3486, rate: 0.0225 }, { threshold: 6972, rate: 0.0414 }, { threshold: 15687, rate: 0.0563 }, { threshold: 26145, rate: 0.0596 }, { threshold: 34860, rate: 0.0625 }, { threshold: 52290, rate: 0.0744 }, { threshold: 78435, rate: 0.0853 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.0033 }, { threshold: 1743, rate: 0.0067 }, { threshold: 3486, rate: 0.0225 }, { threshold: 6972, rate: 0.0414 }, { threshold: 15687, rate: 0.0563 }, { threshold: 26145, rate: 0.0596 }, { threshold: 34860, rate: 0.0625 }, { threshold: 52290, rate: 0.0744 }, { threshold: 78435, rate: 0.0853 }]
  },
  ID: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.01 }, { threshold: 1588, rate: 0.03 }, { threshold: 4763, rate: 0.045 }, { threshold: 7939, rate: 0.06 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.01 }, { threshold: 3176, rate: 0.03 }, { threshold: 9526, rate: 0.045 }, { threshold: 15878, rate: 0.06 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.01 }, { threshold: 1588, rate: 0.03 }, { threshold: 4763, rate: 0.045 }, { threshold: 7939, rate: 0.06 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.01 }, { threshold: 1588, rate: 0.03 }, { threshold: 4763, rate: 0.045 }, { threshold: 7939, rate: 0.06 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.01 }, { threshold: 3176, rate: 0.03 }, { threshold: 9526, rate: 0.045 }, { threshold: 15878, rate: 0.06 }]
  },
  KS: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.031 }, { threshold: 15000, rate: 0.0525 }, { threshold: 30000, rate: 0.057 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.031 }, { threshold: 30000, rate: 0.0525 }, { threshold: 60000, rate: 0.057 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.031 }, { threshold: 15000, rate: 0.0525 }, { threshold: 30000, rate: 0.057 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.031 }, { threshold: 15000, rate: 0.0525 }, { threshold: 30000, rate: 0.057 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.031 }, { threshold: 30000, rate: 0.0525 }, { threshold: 60000, rate: 0.057 }]
  },
  LA: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.0185 }, { threshold: 12500, rate: 0.035 }, { threshold: 50000, rate: 0.0425 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.0185 }, { threshold: 25000, rate: 0.035 }, { threshold: 100000, rate: 0.0425 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.0185 }, { threshold: 12500, rate: 0.035 }, { threshold: 50000, rate: 0.0425 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.0185 }, { threshold: 12500, rate: 0.035 }, { threshold: 50000, rate: 0.0425 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.0185 }, { threshold: 25000, rate: 0.035 }, { threshold: 100000, rate: 0.0425 }]
  },
  MD: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.02 }, { threshold: 1000, rate: 0.03 }, { threshold: 2000, rate: 0.04 }, { threshold: 3000, rate: 0.0475 }, { threshold: 100000, rate: 0.05 }, { threshold: 125000, rate: 0.0525 }, { threshold: 150000, rate: 0.055 }, { threshold: 250000, rate: 0.0575 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.02 }, { threshold: 1000, rate: 0.03 }, { threshold: 2000, rate: 0.04 }, { threshold: 3000, rate: 0.0475 }, { threshold: 150000, rate: 0.05 }, { threshold: 175000, rate: 0.0525 }, { threshold: 225000, rate: 0.055 }, { threshold: 300000, rate: 0.0575 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.02 }, { threshold: 1000, rate: 0.03 }, { threshold: 2000, rate: 0.04 }, { threshold: 3000, rate: 0.0475 }, { threshold: 100000, rate: 0.05 }, { threshold: 125000, rate: 0.0525 }, { threshold: 150000, rate: 0.055 }, { threshold: 250000, rate: 0.0575 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.02 }, { threshold: 1000, rate: 0.03 }, { threshold: 2000, rate: 0.04 }, { threshold: 3000, rate: 0.0475 }, { threshold: 100000, rate: 0.05 }, { threshold: 125000, rate: 0.0525 }, { threshold: 150000, rate: 0.055 }, { threshold: 250000, rate: 0.0575 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.02 }, { threshold: 1000, rate: 0.03 }, { threshold: 2000, rate: 0.04 }, { threshold: 3000, rate: 0.0475 }, { threshold: 150000, rate: 0.05 }, { threshold: 175000, rate: 0.0525 }, { threshold: 225000, rate: 0.055 }, { threshold: 300000, rate: 0.0575 }]
  },
  ME: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.058 }, { threshold: 23000, rate: 0.0675 }, { threshold: 54450, rate: 0.0715 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.058 }, { threshold: 46000, rate: 0.0675 }, { threshold: 108900, rate: 0.0715 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.058 }, { threshold: 23000, rate: 0.0675 }, { threshold: 54450, rate: 0.0715 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.058 }, { threshold: 23000, rate: 0.0675 }, { threshold: 54450, rate: 0.0715 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.058 }, { threshold: 46000, rate: 0.0675 }, { threshold: 108900, rate: 0.0715 }]
  },
  MN: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.0535 }, { threshold: 28080, rate: 0.068 }, { threshold: 92230, rate: 0.0785 }, { threshold: 171220, rate: 0.0985 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.0535 }, { threshold: 41050, rate: 0.068 }, { threshold: 163060, rate: 0.0785 }, { threshold: 284810, rate: 0.0985 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.0535 }, { threshold: 28080, rate: 0.068 }, { threshold: 92230, rate: 0.0785 }, { threshold: 171220, rate: 0.0985 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.0535 }, { threshold: 28080, rate: 0.068 }, { threshold: 92230, rate: 0.0785 }, { threshold: 171220, rate: 0.0985 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.0535 }, { threshold: 41050, rate: 0.068 }, { threshold: 163060, rate: 0.0785 }, { threshold: 284810, rate: 0.0985 }]
  },
  MO: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.015 }, { threshold: 1088, rate: 0.02 }, { threshold: 2176, rate: 0.025 }, { threshold: 3264, rate: 0.03 }, { threshold: 4352, rate: 0.035 }, { threshold: 5440, rate: 0.04 }, { threshold: 6528, rate: 0.045 }, { threshold: 7616, rate: 0.05 }, { threshold: 8704, rate: 0.054 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.015 }, { threshold: 1088, rate: 0.02 }, { threshold: 2176, rate: 0.025 }, { threshold: 3264, rate: 0.03 }, { threshold: 4352, rate: 0.035 }, { threshold: 5440, rate: 0.04 }, { threshold: 6528, rate: 0.045 }, { threshold: 7616, rate: 0.05 }, { threshold: 8704, rate: 0.054 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.015 }, { threshold: 1088, rate: 0.02 }, { threshold: 2176, rate: 0.025 }, { threshold: 3264, rate: 0.03 }, { threshold: 4352, rate: 0.035 }, { threshold: 5440, rate: 0.04 }, { threshold: 6528, rate: 0.045 }, { threshold: 7616, rate: 0.05 }, { threshold: 8704, rate: 0.054 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.015 }, { threshold: 1088, rate: 0.02 }, { threshold: 2176, rate: 0.025 }, { threshold: 3264, rate: 0.03 }, { threshold: 4352, rate: 0.035 }, { threshold: 5440, rate: 0.04 }, { threshold: 6528, rate: 0.045 }, { threshold: 7616, rate: 0.05 }, { threshold: 8704, rate: 0.054 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.015 }, { threshold: 1088, rate: 0.02 }, { threshold: 2176, rate: 0.025 }, { threshold: 3264, rate: 0.03 }, { threshold: 4352, rate: 0.035 }, { threshold: 5440, rate: 0.04 }, { threshold: 6528, rate: 0.045 }, { threshold: 7616, rate: 0.05 }, { threshold: 8704, rate: 0.054 }]
  },
  MS: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.04 }, { threshold: 10000, rate: 0.05 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.04 }, { threshold: 10000, rate: 0.05 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.04 }, { threshold: 10000, rate: 0.05 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.04 }, { threshold: 10000, rate: 0.05 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.04 }, { threshold: 10000, rate: 0.05 }]
  },
  MT: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.01 }, { threshold: 3100, rate: 0.02 }, { threshold: 5500, rate: 0.03 }, { threshold: 8400, rate: 0.04 }, { threshold: 11400, rate: 0.05 }, { threshold: 14600, rate: 0.06 }, { threshold: 18800, rate: 0.0675 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.01 }, { threshold: 3100, rate: 0.02 }, { threshold: 5500, rate: 0.03 }, { threshold: 8400, rate: 0.04 }, { threshold: 11400, rate: 0.05 }, { threshold: 14600, rate: 0.06 }, { threshold: 18800, rate: 0.0675 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.01 }, { threshold: 3100, rate: 0.02 }, { threshold: 5500, rate: 0.03 }, { threshold: 8400, rate: 0.04 }, { threshold: 11400, rate: 0.05 }, { threshold: 14600, rate: 0.06 }, { threshold: 18800, rate: 0.0675 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.01 }, { threshold: 3100, rate: 0.02 }, { threshold: 5500, rate: 0.03 }, { threshold: 8400, rate: 0.04 }, { threshold: 11400, rate: 0.05 }, { threshold: 14600, rate: 0.06 }, { threshold: 18800, rate: 0.0675 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.01 }, { threshold: 3100, rate: 0.02 }, { threshold: 5500, rate: 0.03 }, { threshold: 8400, rate: 0.04 }, { threshold: 11400, rate: 0.05 }, { threshold: 14600, rate: 0.06 }, { threshold: 18800, rate: 0.0675 }]
  },
  NE: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.0246 }, { threshold: 3440, rate: 0.0351 }, { threshold: 20590, rate: 0.0501 }, { threshold: 33180, rate: 0.0684 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.0246 }, { threshold: 6860, rate: 0.0351 }, { threshold: 41190, rate: 0.0501 }, { threshold: 66360, rate: 0.0684 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.0246 }, { threshold: 3440, rate: 0.0351 }, { threshold: 20590, rate: 0.0501 }, { threshold: 33180, rate: 0.0684 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.0246 }, { threshold: 3440, rate: 0.0351 }, { threshold: 20590, rate: 0.0501 }, { threshold: 33180, rate: 0.0684 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.0246 }, { threshold: 6860, rate: 0.0351 }, { threshold: 41190, rate: 0.0501 }, { threshold: 66360, rate: 0.0684 }]
  },
  NM: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.017 }, { threshold: 5500, rate: 0.032 }, { threshold: 11000, rate: 0.047 }, { threshold: 16000, rate: 0.049 }, { threshold: 210000, rate: 0.059 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.017 }, { threshold: 8000, rate: 0.032 }, { threshold: 16000, rate: 0.047 }, { threshold: 24000, rate: 0.049 }, { threshold: 315000, rate: 0.059 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.017 }, { threshold: 5500, rate: 0.032 }, { threshold: 11000, rate: 0.047 }, { threshold: 16000, rate: 0.049 }, { threshold: 210000, rate: 0.059 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.017 }, { threshold: 5500, rate: 0.032 }, { threshold: 11000, rate: 0.047 }, { threshold: 16000, rate: 0.049 }, { threshold: 210000, rate: 0.059 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.017 }, { threshold: 8000, rate: 0.032 }, { threshold: 16000, rate: 0.047 }, { threshold: 24000, rate: 0.049 }, { threshold: 315000, rate: 0.059 }]
  },
  ND: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.011 }, { threshold: 40525, rate: 0.0204 }, { threshold: 98100, rate: 0.0227 }, { threshold: 204675, rate: 0.0264 }, { threshold: 445000, rate: 0.029 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.011 }, { threshold: 67700, rate: 0.0204 }, { threshold: 163550, rate: 0.0227 }, { threshold: 249150, rate: 0.0264 }, { threshold: 445000, rate: 0.029 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.011 }, { threshold: 40525, rate: 0.0204 }, { threshold: 98100, rate: 0.0227 }, { threshold: 204675, rate: 0.0264 }, { threshold: 445000, rate: 0.029 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.011 }, { threshold: 40525, rate: 0.0204 }, { threshold: 98100, rate: 0.0227 }, { threshold: 204675, rate: 0.0264 }, { threshold: 445000, rate: 0.029 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.011 }, { threshold: 67700, rate: 0.0204 }, { threshold: 163550, rate: 0.0227 }, { threshold: 249150, rate: 0.0264 }, { threshold: 445000, rate: 0.029 }]
  },
  OK: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.0025 }, { threshold: 1000, rate: 0.0075 }, { threshold: 2500, rate: 0.0175 }, { threshold: 3750, rate: 0.0275 }, { threshold: 4900, rate: 0.0375 }, { threshold: 7200, rate: 0.0475 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.0025 }, { threshold: 2000, rate: 0.0075 }, { threshold: 5000, rate: 0.0175 }, { threshold: 7500, rate: 0.0275 }, { threshold: 9800, rate: 0.0375 }, { threshold: 12200, rate: 0.0475 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.0025 }, { threshold: 1000, rate: 0.0075 }, { threshold: 2500, rate: 0.0175 }, { threshold: 3750, rate: 0.0275 }, { threshold: 4900, rate: 0.0375 }, { threshold: 7200, rate: 0.0475 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.0025 }, { threshold: 1000, rate: 0.0075 }, { threshold: 2500, rate: 0.0175 }, { threshold: 3750, rate: 0.0275 }, { threshold: 4900, rate: 0.0375 }, { threshold: 7200, rate: 0.0475 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.0025 }, { threshold: 2000, rate: 0.0075 }, { threshold: 5000, rate: 0.0175 }, { threshold: 7500, rate: 0.0275 }, { threshold: 9800, rate: 0.0375 }, { threshold: 12200, rate: 0.0475 }]
  },
  OR: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.0475 }, { threshold: 3650, rate: 0.0675 }, { threshold: 9200, rate: 0.0875 }, { threshold: 125000, rate: 0.099 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.0475 }, { threshold: 7300, rate: 0.0675 }, { threshold: 18400, rate: 0.0875 }, { threshold: 250000, rate: 0.099 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.0475 }, { threshold: 3650, rate: 0.0675 }, { threshold: 9200, rate: 0.0875 }, { threshold: 125000, rate: 0.099 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.0475 }, { threshold: 3650, rate: 0.0675 }, { threshold: 9200, rate: 0.0875 }, { threshold: 125000, rate: 0.099 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.0475 }, { threshold: 7300, rate: 0.0675 }, { threshold: 18400, rate: 0.0875 }, { threshold: 250000, rate: 0.099 }]
  },
  RI: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.0375 }, { threshold: 68200, rate: 0.0475 }, { threshold: 155050, rate: 0.0599 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.0375 }, { threshold: 68200, rate: 0.0475 }, { threshold: 155050, rate: 0.0599 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.0375 }, { threshold: 68200, rate: 0.0475 }, { threshold: 155050, rate: 0.0599 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.0375 }, { threshold: 68200, rate: 0.0475 }, { threshold: 155050, rate: 0.0599 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.0375 }, { threshold: 68200, rate: 0.0475 }, { threshold: 155050, rate: 0.0599 }]
  },
  SC: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0 }, { threshold: 3200, rate: 0.03 }, { threshold: 6410, rate: 0.04 }, { threshold: 9620, rate: 0.05 }, { threshold: 12820, rate: 0.06 }, { threshold: 16040, rate: 0.07 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0 }, { threshold: 3200, rate: 0.03 }, { threshold: 6410, rate: 0.04 }, { threshold: 9620, rate: 0.05 }, { threshold: 12820, rate: 0.06 }, { threshold: 16040, rate: 0.07 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0 }, { threshold: 3200, rate: 0.03 }, { threshold: 6410, rate: 0.04 }, { threshold: 9620, rate: 0.05 }, { threshold: 12820, rate: 0.06 }, { threshold: 16040, rate: 0.07 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0 }, { threshold: 3200, rate: 0.03 }, { threshold: 6410, rate: 0.04 }, { threshold: 9620, rate: 0.05 }, { threshold: 12820, rate: 0.06 }, { threshold: 16040, rate: 0.07 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0 }, { threshold: 3200, rate: 0.03 }, { threshold: 6410, rate: 0.04 }, { threshold: 9620, rate: 0.05 }, { threshold: 12820, rate: 0.06 }, { threshold: 16040, rate: 0.07 }]
  },
  VT: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.0335 }, { threshold: 40950, rate: 0.066 }, { threshold: 99200, rate: 0.076 }, { threshold: 206950, rate: 0.0875 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.0335 }, { threshold: 68400, rate: 0.066 }, { threshold: 165350, rate: 0.076 }, { threshold: 251950, rate: 0.0875 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.0335 }, { threshold: 40950, rate: 0.066 }, { threshold: 99200, rate: 0.076 }, { threshold: 206950, rate: 0.0875 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.0335 }, { threshold: 40950, rate: 0.066 }, { threshold: 99200, rate: 0.076 }, { threshold: 206950, rate: 0.0875 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.0335 }, { threshold: 68400, rate: 0.066 }, { threshold: 165350, rate: 0.076 }, { threshold: 251950, rate: 0.0875 }]
  },
  WI: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.0354 }, { threshold: 12760, rate: 0.0465 }, { threshold: 25520, rate: 0.053 }, { threshold: 280950, rate: 0.0765 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.0354 }, { threshold: 17010, rate: 0.0465 }, { threshold: 34030, rate: 0.053 }, { threshold: 374600, rate: 0.0765 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.0354 }, { threshold: 12760, rate: 0.0465 }, { threshold: 25520, rate: 0.053 }, { threshold: 280950, rate: 0.0765 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.0354 }, { threshold: 12760, rate: 0.0465 }, { threshold: 25520, rate: 0.053 }, { threshold: 280950, rate: 0.0765 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.0354 }, { threshold: 17010, rate: 0.0465 }, { threshold: 34030, rate: 0.053 }, { threshold: 374600, rate: 0.0765 }]
  },
  WV: {
    [FilingStatus.S]: [{ threshold: 0, rate: 0.03 }, { threshold: 10000, rate: 0.04 }, { threshold: 25000, rate: 0.045 }, { threshold: 40000, rate: 0.06 }, { threshold: 60000, rate: 0.065 }],
    [FilingStatus.MFJ]: [{ threshold: 0, rate: 0.03 }, { threshold: 10000, rate: 0.04 }, { threshold: 25000, rate: 0.045 }, { threshold: 40000, rate: 0.06 }, { threshold: 60000, rate: 0.065 }],
    [FilingStatus.MFS]: [{ threshold: 0, rate: 0.03 }, { threshold: 10000, rate: 0.04 }, { threshold: 25000, rate: 0.045 }, { threshold: 40000, rate: 0.06 }, { threshold: 60000, rate: 0.065 }],
    [FilingStatus.HOH]: [{ threshold: 0, rate: 0.03 }, { threshold: 10000, rate: 0.04 }, { threshold: 25000, rate: 0.045 }, { threshold: 40000, rate: 0.06 }, { threshold: 60000, rate: 0.065 }],
    [FilingStatus.W]: [{ threshold: 0, rate: 0.03 }, { threshold: 10000, rate: 0.04 }, { threshold: 25000, rate: 0.045 }, { threshold: 40000, rate: 0.06 }, { threshold: 60000, rate: 0.065 }]
  },
}
