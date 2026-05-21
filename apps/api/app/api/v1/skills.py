from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.skill import SkillUpdate, SkillOut
from app.schemas.common import DataResponse, ListResponse
from app.services import skills as svc

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("", response_model=ListResponse[SkillOut])
def list_skills(db: Session = Depends(get_db)):
    items = svc.list_skills(db)
    return ListResponse(data=items, total=len(items))


@router.get("/{skill_name}", response_model=DataResponse[SkillOut])
def get_skill(skill_name: str, db: Session = Depends(get_db)):
    skill = svc.get_skill(db, skill_name)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return DataResponse(data=skill)


@router.patch("/{skill_name}", response_model=DataResponse[SkillOut])
def update_skill(skill_name: str, body: SkillUpdate, db: Session = Depends(get_db)):
    skill = svc.update_skill(db, skill_name, body)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return DataResponse(data=skill)


@router.post("/reload", response_model=ListResponse[SkillOut])
def reload_skills(db: Session = Depends(get_db)):
    items = svc.reload_skills_from_disk(db)
    return ListResponse(data=items, total=len(items))
