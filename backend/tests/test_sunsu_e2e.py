"""SUNSU end-to-end backend tests covering auth, catalog, cart, coupons,
wishlist, addresses, checkout, orders, reviews, admin, and location."""
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://sunsu-ecom.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@sunsu.in"
ADMIN_PASSWORD = "Sunsu@Admin2026"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


# ---------------- helpers ----------------
def _rand_phone():
    # Random valid Indian mobile
    return "9" + "".join([str((int(time.time() * 1000) >> i) & 9) for i in range(9)])


@pytest.fixture(scope="session")
def user_token(s):
    phone = _rand_phone()
    r = s.post(f"{API}/auth/send-otp", json={"phone": phone})
    assert r.status_code == 200, r.text
    otp = r.json().get("dev_otp")
    assert otp
    r = s.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": otp})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"token": data["token"], "phone": phone, "user": data["user"]}


@pytest.fixture(scope="session")
def auth_headers(user_token):
    return {"Authorization": f"Bearer {user_token['token']}"}


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ================= AUTH =================
class TestAuth:
    def test_health(self, s):
        r = s.get(f"{API}/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"

    def test_send_otp_invalid_phone(self, s):
        r = s.post(f"{API}/auth/send-otp", json={"phone": "1234567890"})
        assert r.status_code == 400

    def test_send_otp_short(self, s):
        r = s.post(f"{API}/auth/send-otp", json={"phone": "98765"})
        assert r.status_code == 400

    def test_send_otp_valid_returns_dev_otp(self, s):
        r = s.post(f"{API}/auth/send-otp", json={"phone": "9876500001"})
        assert r.status_code == 200
        body = r.json()
        assert "dev_otp" in body
        assert len(body["dev_otp"]) == 6

    def test_verify_otp_wrong(self, s):
        s.post(f"{API}/auth/send-otp", json={"phone": "9876500002"})
        r = s.post(f"{API}/auth/verify-otp", json={"phone": "9876500002", "otp": "000000"})
        assert r.status_code == 400

    def test_me_and_update_profile(self, s, user_token, auth_headers):
        r = s.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["phone"] == user_token["phone"]
        # profile update
        r = s.put(f"{API}/auth/profile", headers=auth_headers,
                  json={"name": "Test User", "email": "test@example.com"})
        assert r.status_code == 200
        assert r.json()["name"] == "Test User"
        assert r.json()["email"] == "test@example.com"

    def test_me_without_token(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code in (401, 403)

    def test_admin_login_wrong(self, s):
        r = s.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401


# ================= CATALOG =================
class TestCatalog:
    def test_categories(self, s):
        r = s.get(f"{API}/categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_banners(self, s):
        r = s.get(f"{API}/banners")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_offers(self, s):
        r = s.get(f"{API}/offers")
        assert r.status_code == 200

    def test_settings(self, s):
        r = s.get(f"{API}/settings")
        assert r.status_code == 200

    def test_products_list(self, s):
        r = s.get(f"{API}/products")
        assert r.status_code == 200
        body = r.json()
        assert "products" in body and "total" in body
        assert body["total"] >= 1

    def test_products_filters(self, s):
        # test various filters
        r = s.get(f"{API}/products", params={"sort": "price_asc", "in_stock": True})
        assert r.status_code == 200
        prods = r.json()["products"]
        if len(prods) > 1:
            def base(p): return min(v["price"] for v in p["variants"])
            prices = [base(p) for p in prods]
            assert prices == sorted(prices)

    def test_products_search(self, s):
        r = s.get(f"{API}/products", params={"search": "mango"})
        assert r.status_code == 200

    def test_products_best_seller_filter(self, s):
        r = s.get(f"{API}/products", params={"best_seller": True})
        assert r.status_code == 200

    def test_product_detail_by_slug(self, s):
        r = s.get(f"{API}/products")
        slug = r.json()["products"][0]["slug"]
        r = s.get(f"{API}/products/{slug}")
        assert r.status_code == 200
        p = r.json()
        assert "variants" in p and "related" in p

    def test_search_suggestions(self, s):
        r = s.get(f"{API}/products/search-suggestions", params={"q": "a"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_pincode_valid(self, s):
        r = s.get(f"{API}/location/pincode/560001")
        assert r.status_code == 200
        assert r.json()["city"] == "Bengaluru"
        assert r.json()["serviceable"] is True

    def test_pincode_invalid(self, s):
        r = s.get(f"{API}/location/pincode/12")
        assert r.status_code == 400


# ================= CART =================
@pytest.fixture(scope="session")
def sample_product(s):
    r = s.get(f"{API}/products", params={"in_stock": True})
    for p in r.json()["products"]:
        if p.get("variants") and p["variants"][0].get("stock", 0) > 5:
            return p
    return r.json()["products"][0]


class TestCart:
    def test_get_empty_cart(self, s, auth_headers):
        # clear first
        s.delete(f"{API}/cart", headers=auth_headers)
        r = s.get(f"{API}/cart", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["items"] == []

    def test_add_and_update_and_remove(self, s, auth_headers, sample_product):
        pid = sample_product["id"]
        vid = sample_product["variants"][0]["id"]
        # add
        r = s.post(f"{API}/cart/items", headers=auth_headers,
                   json={"product_id": pid, "variant_id": vid, "quantity": 2})
        assert r.status_code == 200, r.text
        assert len(r.json()["items"]) == 1
        assert r.json()["items"][0]["quantity"] == 2

        # update
        r = s.put(f"{API}/cart/items", headers=auth_headers,
                  json={"product_id": pid, "variant_id": vid, "quantity": 3})
        assert r.status_code == 200
        assert r.json()["items"][0]["quantity"] == 3

        # stock cap
        r = s.put(f"{API}/cart/items", headers=auth_headers,
                  json={"product_id": pid, "variant_id": vid, "quantity": 99999})
        assert r.status_code == 400

        # remove
        r = s.delete(f"{API}/cart/items",
                     params={"product_id": pid, "variant_id": vid},
                     headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["items"] == []

    def test_add_invalid_variant(self, s, auth_headers, sample_product):
        r = s.post(f"{API}/cart/items", headers=auth_headers,
                   json={"product_id": sample_product["id"], "variant_id": "no-such", "quantity": 1})
        assert r.status_code == 400

    def test_merge(self, s, auth_headers, sample_product):
        s.delete(f"{API}/cart", headers=auth_headers)
        pid = sample_product["id"]
        vid = sample_product["variants"][0]["id"]
        r = s.post(f"{API}/cart/merge", headers=auth_headers,
                   json=[{"product_id": pid, "variant_id": vid, "quantity": 1}])
        assert r.status_code == 200
        assert len(r.json()["items"]) == 1


# ================= COUPONS =================
class TestCoupons:
    def test_list_coupons(self, s, auth_headers):
        r = s.get(f"{API}/coupons", headers=auth_headers)
        assert r.status_code == 200
        codes = [c["code"] for c in r.json()]
        for c in ("WELCOME10", "FIRST50", "SUNSU20"):
            assert c in codes

    def _ensure_cart(self, s, auth_headers, sample_product, min_total=None):
        s.delete(f"{API}/cart", headers=auth_headers)
        pid = sample_product["id"]
        # Grab variant with sufficient stock
        vid = sample_product["variants"][0]["id"]
        price = sample_product["variants"][0]["price"]
        qty = 1
        if min_total:
            qty = max(1, int(min_total // price) + 1)
        r = s.post(f"{API}/cart/items", headers=auth_headers,
                   json={"product_id": pid, "variant_id": vid, "quantity": qty})
        assert r.status_code == 200, r.text
        return r.json()

    def test_welcome10_applies(self, s, auth_headers, sample_product):
        self._ensure_cart(s, auth_headers, sample_product)
        r = s.post(f"{API}/cart/apply-coupon", headers=auth_headers, json={"code": "WELCOME10"})
        assert r.status_code == 200, r.text
        assert r.json()["totals"]["coupon_discount"] > 0

    def test_first50_below_min_fails(self, s, auth_headers, sample_product):
        # ensure below 499
        s.delete(f"{API}/cart", headers=auth_headers)
        pid = sample_product["id"]
        vid = sample_product["variants"][0]["id"]
        # add 1 item; if price > 499 skip
        if sample_product["variants"][0]["price"] >= 499:
            pytest.skip("Cannot form <499 cart with this product")
        s.post(f"{API}/cart/items", headers=auth_headers,
               json={"product_id": pid, "variant_id": vid, "quantity": 1})
        r = s.post(f"{API}/cart/apply-coupon", headers=auth_headers, json={"code": "FIRST50"})
        assert r.status_code == 400

    def test_sunsu20_min_and_cap(self, s, auth_headers, sample_product):
        cart = self._ensure_cart(s, auth_headers, sample_product, min_total=800)
        r = s.post(f"{API}/cart/apply-coupon", headers=auth_headers, json={"code": "SUNSU20"})
        assert r.status_code == 200, r.text
        totals = r.json()["totals"]
        assert totals["coupon_discount"] > 0
        assert totals["coupon_discount"] <= 200  # cap ₹200

    def test_invalid_coupon(self, s, auth_headers, sample_product):
        self._ensure_cart(s, auth_headers, sample_product)
        r = s.post(f"{API}/cart/apply-coupon", headers=auth_headers, json={"code": "FAKE_XXX"})
        assert r.status_code == 404

    def test_remove_coupon(self, s, auth_headers, sample_product):
        self._ensure_cart(s, auth_headers, sample_product)
        s.post(f"{API}/cart/apply-coupon", headers=auth_headers, json={"code": "WELCOME10"})
        r = s.delete(f"{API}/cart/coupon", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["totals"]["coupon_discount"] == 0


# ================= WISHLIST =================
class TestWishlist:
    def test_toggle(self, s, auth_headers, sample_product):
        pid = sample_product["id"]
        r = s.post(f"{API}/wishlist", headers=auth_headers, json={"product_id": pid})
        assert r.status_code == 200
        state1 = r.json()["added"]
        r = s.get(f"{API}/wishlist", headers=auth_headers)
        assert r.status_code == 200
        # toggle again
        r = s.post(f"{API}/wishlist", headers=auth_headers, json={"product_id": pid})
        assert r.status_code == 200
        assert r.json()["added"] != state1


# ================= ADDRESSES =================
@pytest.fixture(scope="session")
def address_id(s, auth_headers):
    payload = {
        "full_name": "TEST User",
        "mobile": "9876543210",
        "house": "12A",
        "street": "MG Road",
        "area": "Indiranagar",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
        "address_type": "Home",
        "is_default": True,
    }
    r = s.post(f"{API}/addresses", headers=auth_headers, json=payload)
    assert r.status_code == 200, r.text
    return r.json()["id"]


class TestAddresses:
    def test_list(self, s, auth_headers, address_id):
        r = s.get(f"{API}/addresses", headers=auth_headers)
        assert r.status_code == 200
        assert any(a["id"] == address_id for a in r.json())

    def test_invalid_pincode(self, s, auth_headers):
        payload = {
            "full_name": "X", "mobile": "9876543210", "house": "1", "street": "a",
            "city": "c", "state": "s", "pincode": "12", "address_type": "Home", "is_default": False,
        }
        r = s.post(f"{API}/addresses", headers=auth_headers, json=payload)
        assert r.status_code == 400

    def test_invalid_mobile(self, s, auth_headers):
        payload = {
            "full_name": "X", "mobile": "1234567890", "house": "1", "street": "a",
            "city": "c", "state": "s", "pincode": "560001", "address_type": "Home", "is_default": False,
        }
        r = s.post(f"{API}/addresses", headers=auth_headers, json=payload)
        assert r.status_code == 400

    def test_set_default(self, s, auth_headers, address_id):
        r = s.put(f"{API}/addresses/{address_id}/default", headers=auth_headers)
        assert r.status_code == 200


# ================= CHECKOUT/ORDERS =================
class TestCheckout:
    def _ensure_cart(self, s, auth_headers, sample_product):
        s.delete(f"{API}/cart", headers=auth_headers)
        pid = sample_product["id"]
        vid = sample_product["variants"][0]["id"]
        s.post(f"{API}/cart/items", headers=auth_headers,
               json={"product_id": pid, "variant_id": vid, "quantity": 1})

    def test_checkout_empty_cart(self, s, auth_headers, address_id):
        s.delete(f"{API}/cart", headers=auth_headers)
        r = s.post(f"{API}/checkout", headers=auth_headers,
                   json={"address_id": address_id, "payment_method": "cod"})
        assert r.status_code == 400

    def test_checkout_cod_success(self, s, auth_headers, sample_product, address_id):
        self._ensure_cart(s, auth_headers, sample_product)
        # capture stock before
        pr = s.get(f"{API}/products/{sample_product['slug']}").json()
        stock_before = next(v["stock"] for v in pr["variants"] if v["id"] == sample_product["variants"][0]["id"])
        r = s.post(f"{API}/checkout", headers=auth_headers,
                   json={"address_id": address_id, "payment_method": "cod"})
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["status"] == "Order Placed"
        assert order["payment_method"] == "cod"
        assert order["total"] > 0

        # verify stock decremented
        pr2 = s.get(f"{API}/products/{sample_product['slug']}").json()
        stock_after = next(v["stock"] for v in pr2["variants"] if v["id"] == sample_product["variants"][0]["id"])
        assert stock_after == stock_before - 1

        # cart cleared
        r = s.get(f"{API}/cart", headers=auth_headers)
        assert r.json()["items"] == []

        # order visible in list
        r = s.get(f"{API}/orders", headers=auth_headers)
        assert any(o["id"] == order["id"] for o in r.json())

        # get by id
        r = s.get(f"{API}/orders/{order['id']}", headers=auth_headers)
        assert r.status_code == 200
        assert "status_flow" in r.json()

        # cancel restores stock
        r = s.post(f"{API}/orders/{order['id']}/cancel", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "Cancelled"
        pr3 = s.get(f"{API}/products/{sample_product['slug']}").json()
        stock_final = next(v["stock"] for v in pr3["variants"] if v["id"] == sample_product["variants"][0]["id"])
        assert stock_final == stock_before  # restored


# ================= REVIEWS =================
class TestReviews:
    def test_get_reviews(self, s, sample_product):
        r = s.get(f"{API}/products/{sample_product['id']}/reviews")
        assert r.status_code == 200
        assert "reviews" in r.json()

    def test_post_review(self, s, auth_headers, sample_product):
        r = s.post(f"{API}/products/{sample_product['id']}/reviews", headers=auth_headers,
                   json={"rating": 5, "title": "Great", "comment": "Loved it"})
        assert r.status_code == 200

    def test_post_review_invalid_rating(self, s, auth_headers, sample_product):
        r = s.post(f"{API}/products/{sample_product['id']}/reviews", headers=auth_headers,
                   json={"rating": 10, "title": "x", "comment": "y"})
        assert r.status_code == 400


# ================= ADMIN =================
class TestAdmin:
    def test_dashboard_forbidden_without_token(self, s):
        r = s.get(f"{API}/admin/dashboard")
        assert r.status_code in (401, 403)

    def test_dashboard_forbidden_with_user_token(self, s, auth_headers):
        r = s.get(f"{API}/admin/dashboard", headers=auth_headers)
        assert r.status_code == 403

    def test_dashboard(self, s, admin_headers):
        r = s.get(f"{API}/admin/dashboard", headers=admin_headers)
        assert r.status_code == 200
        body = r.json()
        for k in ("revenue", "total_orders", "customers", "products", "best_sellers", "low_stock"):
            assert k in body

    def test_admin_orders(self, s, admin_headers):
        r = s.get(f"{API}/admin/orders", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_customers(self, s, admin_headers):
        r = s.get(f"{API}/admin/customers", headers=admin_headers)
        assert r.status_code == 200

    def test_admin_coupons(self, s, admin_headers):
        r = s.get(f"{API}/admin/coupons", headers=admin_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 3
