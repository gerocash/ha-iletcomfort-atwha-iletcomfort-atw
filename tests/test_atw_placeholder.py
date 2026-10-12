"""Regression tests for the ATW repeated placeholder sensor pattern."""
from custom_components.iletcomfort_atw.model_profiles import (
    atw_sensors_are_placeholder,
    decode_atw_status,
)


def test_171h120f_placeholder_with_constant_0x28():
    frame = bytes.fromhex("02 00 " + " ".join(["03 28 00 00 00 00"] * 6))
    assert atw_sensors_are_placeholder(frame)


def test_reject_non_placeholder_when_one_group_differs():
    frame = bytes.fromhex(
        "02 00 03 28 00 00 00 00 03 28 00 00 00 00 "
        "03 29 00 00 00 00 03 28 00 00 00 00 "
        "03 28 00 00 00 00 03 28 00 00 00 00"
    )
    assert not atw_sensors_are_placeholder(frame)


def test_reject_frame_with_nonzero_sensor_byte():
    frame = bytes.fromhex(
        "02 00 03 28 00 00 00 00 03 28 01 00 00 00 "
        "03 28 00 00 00 00 03 28 00 00 00 00 "
        "03 28 00 00 00 00 03 28 00 00 00 00"
    )
    assert not atw_sensors_are_placeholder(frame)



def test_171h120f_zone1_heating_bit_matches_captured_before_after():
    # Captured on this installation: before heating byte[1] was 0x04;
    # after the user started heating byte[1] became 0x05. The other confirmed
    # zone-1 state bit is bit 0 of that byte.
    before = bytes.fromhex(
        "01 04 17 90 03 03 23 1e 2c 30 41 23 19 05 37 "
        "19 19 05 3c 22 3c 14 32 00 80"
    )
    after = bytes.fromhex(
        "01 05 17 90 03 03 23 1e 2c 30 41 23 19 05 37 "
        "19 19 05 3c 22 3c 14 30 00 80"
    )
    assert decode_atw_status(before).pump_system is False
    assert decode_atw_status(after).pump_system is True


def test_171h120f_unverified_compressor_fields_are_unavailable():
    body = bytes.fromhex(
        "01 05 17 90 03 03 23 1e 2c 30 41 23 19 05 37 "
        "19 19 05 3c 22 3c 14 30 00 80"
    )
    status = decode_atw_status(body)
    assert status.pump_system is True
    assert status.comp_running is None
    assert status.comp_frq is None
    assert status.total_kwh is None
    assert status.comp_total_run_hours is None
    assert status.fan_total_run_hours is None
    assert status.pressure_h is None
    assert status.pressure_l is None
