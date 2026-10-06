import { describe, expect, it } from 'vitest'
import { calculatePurity } from '../src/lib/purityEngine'

describe('[REQ-CHEM-01] アスピリン精製', () => {
  it('適正な条件で純度99.9%を返す', () => {
    const result = calculatePurity({
      reactants: ['SalicylicAcid', 'AceticAnhydride'],
      catalystDrops: 2,
      targetTemperature: 75,
      reactionTimeSeconds: 10,
      equipmentTier: 3,
    })

    expect(result.productName).toBe('Aspirin')
    expect(result.purityPercentage).toBe(99.9)
    expect(result.hasToxicImpurities).toBe(false)
  })

  it('同じ入力を複数回実行しても結果が一致する', () => {
    const input = {
      reactants: ['SalicylicAcid', 'AceticAnhydride'],
      catalystDrops: 2,
      targetTemperature: 75,
      reactionTimeSeconds: 10,
      equipmentTier: 3,
    }

    expect(calculatePurity(input)).toEqual(calculatePurity(input))
  })
})

describe('[REQ-CHEM-02] 反応不全判定', () => {
  it('触媒不足時は未反応とする', () => {
    const result = calculatePurity({
      reactants: ['SalicylicAcid', 'AceticAnhydride'],
      catalystDrops: 0,
      targetTemperature: 75,
      reactionTimeSeconds: 10,
      equipmentTier: 3,
    })

    expect(result.purityPercentage).toBe(0)
    expect(result.unreactedPercentage).toBe(100)
  })
})

describe('[REQ-CHEM-03] 過熱判定', () => {
  it('過熱時は有毒不純物を検出する', () => {
    const result = calculatePurity({
      reactants: ['SalicylicAcid', 'AceticAnhydride'],
      catalystDrops: 2,
      targetTemperature: 95,
      reactionTimeSeconds: 10,
      equipmentTier: 3,
    })

    expect(result.purityPercentage).toBeLessThan(70)
    expect(result.hasToxicImpurities).toBe(true)
  })
})

describe('[REQ-CHEM-04] 設備性能補正', () => {
  it('Tier 1 の純度上限を適用する', () => {
    const result = calculatePurity({
      reactants: ['SalicylicAcid', 'AceticAnhydride'],
      catalystDrops: 2,
      targetTemperature: 75,
      reactionTimeSeconds: 10,
      equipmentTier: 1,
    })

    expect(result.purityPercentage).toBeLessThanOrEqual(85)
  })
})
