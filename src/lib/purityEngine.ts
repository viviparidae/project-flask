export type PurityInput = {
  reactants: string[]
  catalystDrops: number
  targetTemperature: number
  reactionTimeSeconds: number
  equipmentTier: number
}

export type PurityResult = {
  productName: string
  purityPercentage: number
  hasToxicImpurities: boolean
  unreactedPercentage: number
  effectiveTemperature: number
}

const equipmentCaps = [0, 85, 95, 99.9]

export function calculatePurity(input: PurityInput): PurityResult {
  const equipmentCap = equipmentCaps[Math.min(Math.max(input.equipmentTier, 1), 3)]
  const temperatureFactor = input.targetTemperature >= 70 && input.targetTemperature <= 80
    ? 1
    : input.targetTemperature < 70
      ? 0.5
      : 0.2
  const catalystFactor = Math.min(input.catalystDrops, 2) / 2
  const reactionFactor = Math.min(input.reactionTimeSeconds / 10, 1)
  const purity = Math.max(
    0,
    Math.min(equipmentCap, 99.9 * temperatureFactor * catalystFactor * reactionFactor),
  )
  const hasToxicImpurities = input.targetTemperature >= 85 || purity < 50
  const unreactedPercentage = Math.max(0, 100 - purity)

  return {
    productName: 'Aspirin',
    purityPercentage: Math.round(purity * 10) / 10,
    hasToxicImpurities,
    unreactedPercentage: Math.round(unreactedPercentage * 10) / 10,
    effectiveTemperature: input.targetTemperature,
  }
}
