from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any, List, Optional

from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, Field, ConfigDict


def _validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str):
        return v
    raise ValueError("Invalid ObjectId")


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return now_utc().isoformat()


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc: Optional[dict]):
        if not doc:
            return None
        return cls(**doc)

    def to_mongo(self, exclude_none: bool = True) -> dict:
        data = self.model_dump(by_alias=True, exclude_none=exclude_none)
        if data.get("_id") is None:
            data.pop("_id", None)
        return data


# ---------- Auth / User ----------
class User(BaseDocument):
    phone: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    created_at: str = Field(default_factory=iso_now)


class SendOtpRequest(BaseModel):
    phone: str


class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


class AdminLoginRequest(BaseModel):
    email: str
    password: str


# ---------- Catalog ----------
class Variant(BaseModel):
    id: str
    weight: str  # e.g. "100g"
    price: float
    mrp: float
    stock: int = 100


class Product(BaseDocument):
    slug: str
    name: str
    tagline: Optional[str] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    category_slug: str
    category_name: Optional[str] = None
    needs: List[str] = []  # energy, immunity, digestion...
    dietary: List[str] = []  # vegan, gluten-free...
    ingredients: List[str] = []
    ingredients_text: Optional[str] = None
    nutrition: List[dict] = []  # [{label, value}]
    benefits: List[str] = []
    how_to_use: List[str] = []
    storage: Optional[str] = None
    shelf_life: Optional[str] = None
    allergen_info: Optional[str] = None
    faqs: List[dict] = []  # [{q, a}]
    images: List[str] = []
    variants: List[Variant] = []
    rating: float = 0
    review_count: int = 0
    is_best_seller: bool = False
    is_new: bool = False
    is_active: bool = True
    sort_order: int = 0
    created_at: str = Field(default_factory=iso_now)


class Category(BaseDocument):
    slug: str
    name: str
    image: Optional[str] = None
    accent: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class Banner(BaseDocument):
    title: str
    subtitle: Optional[str] = None
    cta_text: Optional[str] = None
    cta_target: Optional[str] = None
    image: str
    accent: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class Review(BaseDocument):
    product_id: str
    user_id: str
    user_name: str
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None
    verified_purchase: bool = False
    created_at: str = Field(default_factory=iso_now)


class ReviewCreate(BaseModel):
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None


# ---------- Cart / Wishlist ----------
class CartItemInput(BaseModel):
    product_id: str
    variant_id: str
    quantity: int = 1


class UpdateQtyInput(BaseModel):
    product_id: str
    variant_id: str
    quantity: int


class WishlistInput(BaseModel):
    product_id: str


# ---------- Addresses ----------
class Address(BaseDocument):
    user_id: str
    full_name: str
    mobile: str
    house: str
    street: str
    area: Optional[str] = None
    landmark: Optional[str] = None
    city: str
    state: str
    pincode: str
    address_type: str = "Home"
    is_default: bool = False
    created_at: str = Field(default_factory=iso_now)


class AddressInput(BaseModel):
    full_name: str
    mobile: str
    house: str
    street: str
    area: Optional[str] = None
    landmark: Optional[str] = None
    city: str
    state: str
    pincode: str
    address_type: str = "Home"
    is_default: bool = False


# ---------- Coupons ----------
class Coupon(BaseDocument):
    code: str
    description: Optional[str] = None
    discount_type: str = "percentage"  # percentage | fixed
    discount_value: float = 0
    min_order: float = 0
    max_discount: Optional[float] = None
    expiry: Optional[str] = None
    usage_limit: Optional[int] = None
    per_user_limit: Optional[int] = None
    used_count: int = 0
    applicable_categories: List[str] = []
    applicable_products: List[str] = []
    is_active: bool = True


class ApplyCouponInput(BaseModel):
    code: str


# ---------- Orders ----------
class CheckoutInput(BaseModel):
    address_id: str
    coupon_code: Optional[str] = None
    payment_method: str = "cod"  # cod | razorpay


class Order(BaseDocument):
    order_number: str
    user_id: str
    items: List[dict] = []
    address: dict = {}
    subtotal: float = 0
    discount: float = 0
    coupon_code: Optional[str] = None
    shipping: float = 0
    tax: float = 0
    total: float = 0
    payment_method: str = "cod"
    payment_status: str = "pending"  # pending | paid | failed
    status: str = "Order Placed"
    status_history: List[dict] = []
    tracking_number: Optional[str] = None
    estimated_delivery: Optional[str] = None
    created_at: str = Field(default_factory=iso_now)


class UpdateOrderStatusInput(BaseModel):
    status: str
    tracking_number: Optional[str] = None
