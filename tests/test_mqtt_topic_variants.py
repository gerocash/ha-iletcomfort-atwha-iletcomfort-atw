"""Tests for appliance-scoped MQTT topic discovery."""
from custom_components.iletcomfort_atw.mqtt import _topic_log_labels, push_topics


def test_topics_are_exactly_scoped_to_one_appliance():
    topics = push_topics("eu", "153931629840310")
    assert "eu/midea/dev/153931629840310" in topics
    assert "eu/midea/will/153931629840310" in topics
    assert "eu/midea/hbt/153931629840310" in topics
    assert "eu/eu_153931629840310/dev" in topics
    assert "eu/eu_153931629840310/will" in topics
    assert "eu/eu_153931629840310/hbt" in topics
    assert all("153931629840310" in topic for topic in topics)
    assert all("+" not in topic and "#" not in topic for topic in topics)


def test_topics_respect_region():
    topics = push_topics("us", "DEVICE1")
    assert all(topic.startswith("us/") for topic in topics)



def test_topic_log_labels_never_include_appliance_identifier():
    assert _topic_log_labels("eu/midea/dev/153931629840310") == ("midea", "dev")
    assert _topic_log_labels("eu/eu_153931629840310/hbt") == ("regional", "hbt")
