import pytest
from app.services.skills import reload_skills_from_disk, _load_skill_from_yaml


class TestSkillRegistry:
    def test_load_skill_from_yaml(self):
        import os
        skills_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "skills")
        prd_dir = os.path.join(skills_dir, "prd-writer")
        if os.path.isdir(prd_dir):
            result = _load_skill_from_yaml(prd_dir)
            assert result is not None
            assert result["name"] == "prd-writer"
            assert result["version"] is not None
            assert result["source"] == "yaml"

    def test_load_nonexistent_skill(self):
        result = _load_skill_from_yaml("/nonexistent/path")
        assert result is None

    def test_reload_skills_from_disk(self, db_session):
        skills = reload_skills_from_disk(db_session)
        assert isinstance(skills, list)
        if skills:
            names = [s.name for s in skills]
            assert "prd-writer" in names

    def test_skill_has_required_fields(self, db_session):
        skills = reload_skills_from_disk(db_session)
        for skill in skills:
            assert skill.name
            assert skill.version
            assert skill.source in ("yaml", "db", "built-in")
