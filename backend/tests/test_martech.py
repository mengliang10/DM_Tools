from backend.services import martech


SAMPLE_HTML = """
<!doctype html>
<html><head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123"></script>
  <script>gtag('config','G-ABC123')</script>
  <script src="https://cdn.heapanalytics.com/h.js"></script>
  <link rel="stylesheet" href="https://example.com/style.css" />
</head><body>
  <script src="https://js.hs-scripts.com/12345.js"></script>
</body></html>
"""


def test_detect_finds_known_vendors():
    found = martech.detect(SAMPLE_HTML)
    names = {f["name"] for f in found}
    assert "Google Analytics 4" in names
    assert "Heap Analytics" in names


def test_detect_returns_sorted_results():
    found = martech.detect(SAMPLE_HTML)
    keys = [(f["category"], f["name"]) for f in found]
    assert keys == sorted(keys)


def test_detect_handles_empty_html():
    assert martech.detect("") == []


def test_categories_is_nonempty():
    assert len(martech.categories()) > 5
