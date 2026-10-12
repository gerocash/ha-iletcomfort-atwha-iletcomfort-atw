"""Regression tests for the ATW repeated placeholder sensor pattern."""
from custom_components.iletcomfort_atw.model_profiles import atw_sensors_are_placeholder


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
