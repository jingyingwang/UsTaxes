import F1040 from '../F1040'

export default class SDUnrecaptured1250 {
  f1040: F1040

  constructor(f1040: F1040) {
    this.f1040 = f1040
  }

  l18 = (): number | undefined => this.f1040.f4797?.unrecaptured1250Gain()
}
