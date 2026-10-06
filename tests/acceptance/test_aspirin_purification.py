"""[REQ-CHEM-01] [REQ-CHEM-02] [REQ-CHEM-03] [REQ-CHEM-04] [NFR-REPR-01]
アスピリン精製・純度シミュレーションの受け入れテスト (Acceptance Tests)
準拠規格: 『ソフトウェア要求 第4版』/ ISO/IEC 29148 垂直トレーサビリティ
"""

import pytest

# 実装予定のドメインサービス / 値オブジェクトのインポート
from src.domain.entities.equipment import Equipment, EquipmentTier
from src.domain.services.purity_calculator import PurityCalculator
from src.domain.values.reaction_params import ReactionInput


@pytest.fixture
def precision_equipment() -> Equipment:
    """テスト用フィクスチャ: 温度ブレのない精密マントルヒーター (Tier 3)"""
    return Equipment(
        id="eq-mantle-heater-01",
        name="精密マントルヒーター",
        tier=EquipmentTier.TIER_3,
        temp_variance=0.0,
        purity_cap=99.9,
    )


@pytest.fixture
def crude_equipment() -> Equipment:
    """テスト用フィクスチャ: 温度ブレが大きい粗末な焚火 (Tier 1)"""
    return Equipment(
        id="eq-crude-fire-01",
        name="粗末な焚火",
        tier=EquipmentTier.TIER_1,
        temp_variance=10.0,
        purity_cap=85.0,
    )


@pytest.fixture
def calculator() -> PurityCalculator:
    """純度計算エンジンのインスタンス"""
    return PurityCalculator()


# -----------------------------------------------------------------------------
# REQ-CHEM-01: 適正条件における高純度アスピリン精製
# -----------------------------------------------------------------------------


@pytest.mark.acceptance
@pytest.mark.req("REQ-CHEM-01")
def test_aspirin_purification_at_optimal_temperature_75c(
    calculator: PurityCalculator, precision_equipment: Equipment
) -> None:
    """[REQ-CHEM-01]
    Given: サリチル酸と無水酢酸が投入され、触媒として濃硫酸が2滴添加されている
    When: 最適温度 75℃ で加熱精製を実行する
    Then: 純度 99.9% のアスピリンが生成され、有害不純物フラグが False であること
    """
    # Given
    reaction_input = ReactionInput(
        reactants=["SalicylicAcid", "AceticAnhydride"],
        catalyst="SulfuricAcid",
        catalyst_drops=2,
        target_temperature=75.0,
        reaction_time_seconds=10.0,
    )

    # When
    result = calculator.calculate(reaction_input, precision_equipment)

    # Then
    assert result.product_name == "Aspirin"
    assert result.purity_percentage == 99.9
    assert result.has_toxic_impurities is False
    assert result.unreacted_percentage <= 0.1


@pytest.mark.acceptance
@pytest.mark.req("REQ-CHEM-01")
def test_aspirin_purification_at_lower_boundary_70c(
    calculator: PurityCalculator, precision_equipment: Equipment
) -> None:
    """[REQ-CHEM-01]
    Given: サリチル酸と無水酢酸が投入され、触媒として濃硫酸が1滴添加されている
    When: 適正温度下限 70℃ で加熱精製を実行する
    Then: 純度 95.0% 以上の標準アスピリンが生成されること
    """
    # Given
    reaction_input = ReactionInput(
        reactants=["SalicylicAcid", "AceticAnhydride"],
        catalyst="SulfuricAcid",
        catalyst_drops=1,
        target_temperature=70.0,
        reaction_time_seconds=10.0,
    )

    # When
    result = calculator.calculate(reaction_input, precision_equipment)

    # Then
    assert result.product_name == "Aspirin"
    assert result.purity_percentage >= 95.0
    assert result.has_toxic_impurities is False


# -----------------------------------------------------------------------------
# REQ-CHEM-02: 触媒不足または低温時の反応不全判定
# -----------------------------------------------------------------------------


@pytest.mark.acceptance
@pytest.mark.req("REQ-CHEM-02")
def test_aspirin_purification_without_catalyst(
    calculator: PurityCalculator, precision_equipment: Equipment
) -> None:
    """[REQ-CHEM-02]
    Given: サリチル酸と無水酢酸が投入されている
    When: 触媒が0滴の状態で加熱精製を実行する
    Then: 反応が進行せず、アスピリン純度は 0.0%（未反応原料 100%）であること
    """
    # Given
    reaction_input = ReactionInput(
        reactants=["SalicylicAcid", "AceticAnhydride"],
        catalyst="SulfuricAcid",
        catalyst_drops=0,
        target_temperature=75.0,
        reaction_time_seconds=10.0,
    )

    # When
    result = calculator.calculate(reaction_input, precision_equipment)

    # Then
    assert result.purity_percentage == 0.0
    assert result.unreacted_percentage == 100.0


@pytest.mark.acceptance
@pytest.mark.req("REQ-CHEM-02")
def test_aspirin_purification_at_low_temperature_50c(
    calculator: PurityCalculator, precision_equipment: Equipment
) -> None:
    """[REQ-CHEM-02]
    Given: サリチル酸と無水酢酸、および濃硫酸が投入されている
    When: 適正温度未満の 50℃ で加熱精製を実行する
    Then: 反応が不十分となり、純度は 50.0% 未満（未反応原料が大部分残存）であること
    """
    # Given
    reaction_input = ReactionInput(
        reactants=["SalicylicAcid", "AceticAnhydride"],
        catalyst="SulfuricAcid",
        catalyst_drops=2,
        target_temperature=50.0,
        reaction_time_seconds=10.0,
    )

    # When
    result = calculator.calculate(reaction_input, precision_equipment)

    # Then
    assert result.purity_percentage < 50.0
    assert result.unreacted_percentage > 50.0
    assert result.has_toxic_impurities is False


# -----------------------------------------------------------------------------
# REQ-CHEM-03: 過熱時の熱分解および有毒不純物副生判定
# -----------------------------------------------------------------------------


@pytest.mark.acceptance
@pytest.mark.req("REQ-CHEM-03")
def test_aspirin_purification_overheating_decomposition(
    calculator: PurityCalculator, precision_equipment: Equipment
) -> None:
    """[REQ-CHEM-03]
    Given: 原料および濃硫酸が投入されている
    When: 適正温度を超過する 95℃ で過熱精製を実行する
    Then: 純度が急落（70%未満）し、有害不純物混入フラグが True となること
    """
    # Given
    reaction_input = ReactionInput(
        reactants=["SalicylicAcid", "AceticAnhydride"],
        catalyst="SulfuricAcid",
        catalyst_drops=2,
        target_temperature=95.0,
        reaction_time_seconds=10.0,
    )

    # When
    result = calculator.calculate(reaction_input, precision_equipment)

    # Then
    assert result.purity_percentage < 70.0
    assert result.has_toxic_impurities is True


# -----------------------------------------------------------------------------
# REQ-CHEM-04: 設備安定度による実効温度補正
# -----------------------------------------------------------------------------


@pytest.mark.acceptance
@pytest.mark.req("REQ-CHEM-04")
def test_effective_temperature_with_equipment_fluctuation(
    calculator: PurityCalculator, crude_equipment: Equipment
) -> None:
    """[REQ-CHEM-04]
    Given: 温度ブレ幅 ±10℃ を持つ粗末な焚火が配備されている
    When: 目標温度 75℃ で加熱精製を実行する
    Then: 実効温度に設備のブレ幅が決定論的に反映され、粗末な設備の純度上限（85.0%）でクリップされること
    """
    # Given
    reaction_input = ReactionInput(
        reactants=["SalicylicAcid", "AceticAnhydride"],
        catalyst="SulfuricAcid",
        catalyst_drops=2,
        target_temperature=75.0,
        reaction_time_seconds=10.0,
    )

    # When
    result = calculator.calculate(reaction_input, crude_equipment)

    # Then
    # Tier 1 器具の上限キャップにより純度は 85.0% 以下に制限される
    assert result.purity_percentage <= crude_equipment.purity_cap
    assert result.effective_temperature != 75.0 or result.purity_percentage <= 85.0


# -----------------------------------------------------------------------------
# NFR-REPR-01: 純度計算の完全決定論性 (Determinism)
# -----------------------------------------------------------------------------


@pytest.mark.acceptance
@pytest.mark.req("NFR-REPR-01")
def test_purity_calculation_perfect_determinism(
    calculator: PurityCalculator, precision_equipment: Equipment
) -> None:
    """[NFR-REPR-01]
    Given: 同一の反応条件入力
    When: 連続して 100 回純度計算を実行する
    Then: 100 回すべての計算結果（純度・不純物フラグ・実効温度）が 100% 完全一致すること
    """
    # Given
    reaction_input = ReactionInput(
        reactants=["SalicylicAcid", "AceticAnhydride"],
        catalyst="SulfuricAcid",
        catalyst_drops=2,
        target_temperature=75.0,
        reaction_time_seconds=10.0,
    )

    # When
    results = [
        calculator.calculate(reaction_input, precision_equipment)
        for _ in range(100)
    ]

    # Then
    first = results[0]
    for r in results[1:]:
        assert r.purity_percentage == first.purity_percentage
        assert r.has_toxic_impurities == first.has_toxic_impurities
        assert r.effective_temperature == first.effective_temperature
        assert r.unreacted_percentage == first.unreacted_percentage
