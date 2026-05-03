from backend.api import helpers


def test_brand_mentioned_case_insensitive():
    assert helpers.brand_mentioned("We love Acme.", "acme")
    assert helpers.brand_mentioned("ACME is great", "Acme")
    assert not helpers.brand_mentioned("nothing here", "acme")
    assert not helpers.brand_mentioned("anything", "")


def test_citation_detected_handles_subdomain_and_path():
    assert helpers.citation_detected(
        "Visit example.com for details", "https://www.example.com/x"
    )
    assert helpers.citation_detected(
        "shop at acme.io now", "https://acme.io"
    )
    assert not helpers.citation_detected("nothing matches", "https://example.com")


def test_sentiment_positive_negative_neutral():
    assert helpers.analyze_sentiment("Acme is the best, top recommended.", "Acme") == "positive"
    assert helpers.analyze_sentiment("Acme is poor and bad value.", "Acme") == "negative"
    assert helpers.analyze_sentiment("Acme exists.", "Acme") == "neutral"
    assert helpers.analyze_sentiment("no brand here", "Acme") == "neutral"


def test_competitors_in_text_finds_known_and_candidates():
    found = helpers.competitors_in_text(
        "We compete with HubSpot and Salesforce. Bigly Corp is rising.",
        ["HubSpot", "Salesforce", "Marketo"],
    )
    assert "HubSpot" in found
    assert "Salesforce" in found
    assert "Marketo" not in found  # not in text
    assert "Bigly Corp" in found    # discovered


def test_lang_suffix_known_and_unknown():
    assert "Japanese" in helpers.lang_suffix("ja")
    assert helpers.lang_suffix("en") == ""
    assert helpers.lang_suffix("unknown-lang") == ""
