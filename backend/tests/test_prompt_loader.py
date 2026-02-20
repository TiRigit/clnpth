import pytest
from services.prompt_loader import load_prompt, render_prompt


def test_load_prompt_review():
    data = load_prompt("review")
    assert "template" in data
    assert "{original}" in data["template"]
    assert "{translation}" in data["template"]


def test_load_prompt_evaluation():
    data = load_prompt("evaluation")
    assert "template" in data
    assert "{titel}" in data["template"]


def test_load_prompt_image():
    data = load_prompt("image")
    assert "negative_prompt" in data
    assert "styles" in data
    assert "illustration" in data["styles"]


def test_load_prompt_social():
    data = load_prompt("social")
    assert "template" in data
    assert "{titel}" in data["template"]


def test_render_prompt():
    result = render_prompt("review", original="Hallo", translation="Hello", lang="Englisch")
    assert "Hallo" in result
    assert "Hello" in result
    assert "Englisch" in result


def test_load_prompt_missing():
    # Clear cache first
    load_prompt.cache_clear()
    with pytest.raises(FileNotFoundError):
        load_prompt("nonexistent_prompt_xyz")


def test_cache_clear():
    load_prompt.cache_clear()
    data1 = load_prompt("review")
    data2 = load_prompt("review")
    assert data1 is data2  # Same cached object
    load_prompt.cache_clear()
