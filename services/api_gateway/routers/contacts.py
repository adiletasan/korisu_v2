from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from database import get_db
from models import User, UserContact
from security import get_current_user
from schemas import AddContactRequest

router = APIRouter()


@router.get("/")
async def list_contacts(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(UserContact, User)
        .join(User, User.id == UserContact.contact_user_id)
        .where(UserContact.owner_id == current_user["user_id"])
        .order_by(User.name)
    )
    rows = result.all()

    return [
        {
            "id": str(row.UserContact.id),
            "user_id": str(row.User.id),
            "email": row.User.email,
            "name": row.UserContact.nickname or row.User.name,
            "avatar_url": row.User.avatar_url,
        }
        for row in rows
    ]


@router.post("/")
async def add_contact(
    body: AddContactRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    owner_id = current_user["user_id"]

    # Find target user
    result = await db.execute(select(User).where(User.email == body.email, User.verified == True))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "USER_NOT_FOUND")

    if str(target.id) == owner_id:
        raise HTTPException(400, "CANNOT_ADD_SELF")

    # Check duplicate
    existing = await db.execute(
        select(UserContact).where(
            UserContact.owner_id == owner_id,
            UserContact.contact_user_id == target.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "ALREADY_IN_CONTACTS")

    contact = UserContact(
        owner_id=owner_id,
        contact_user_id=target.id,
        nickname=body.nickname,
    )
    db.add(contact)
    await db.commit()

    return {
        "id": str(contact.id),
        "user_id": str(target.id),
        "email": target.email,
        "name": body.nickname or target.name,
        "avatar_url": target.avatar_url,
    }


@router.delete("/{contact_id}")
async def remove_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(UserContact).where(
            UserContact.id == contact_id,
            UserContact.owner_id == current_user["user_id"],
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")

    await db.delete(contact)
    await db.commit()
    return {"ok": True}


@router.get("/search")
async def search_users(
    q: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if len(q) < 2:
        return []

    result = await db.execute(
        select(User).where(
            User.email.ilike(f"%{q}%"),
            User.verified == True,
            User.id != current_user["user_id"],
        ).limit(10)
    )
    users = result.scalars().all()

    return [
        {"id": str(u.id), "email": u.email, "name": u.name, "avatar_url": u.avatar_url}
        for u in users
    ]
