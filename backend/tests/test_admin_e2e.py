"""Admin portal E2E tests: full customer -> admin status update -> customer reflect loop."""
import os
import time

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://sunsu-ecom.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@sunsu.in"
ADMIN_PASSWORD = "Sunsu@Admin2026"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_headers(s):
    r = s.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "token" in body
    # verify claim
    assert body.get("user", {}).get("is_admin") is True or "is_admin" in body.get("user", {})
    return {"Authorization": f"Bearer {body['token']}"}


@pytest.fixture(scope="module")
def customer_ctx(s):
    phone = "9" + str(int(time.time()))[-9:]
    r = s.post(f"{API}/auth/send-otp", json={"phone": phone})
    assert r.status_code == 200, r.text
    otp = r.json()["dev_otp"]
    r = s.post(f"{API}/auth/verify-otp", json={"phone": phone, "otp": otp})
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # add address
    payload = {
        "full_name": "TEST Admin E2E",
        "mobile": "9876543210",
        "house": "42",
        "street": "MG Road",
        "area": "Indiranagar",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
        "address_type": "Home",
        "is_default": True,
    }
    r = s.post(f"{API}/addresses", headers=headers, json=payload)
    assert r.status_code == 200, r.text
    address_id = r.json()["id"]

    return {"headers": headers, "address_id": address_id, "phone": phone}


class TestAdminAuthGuards:
    def test_dashboard_no_token(self, s):
        r = s.get(f"{API}/admin/dashboard")
        assert r.status_code in (401, 403)

    def test_orders_no_token(self, s):
        r = s.get(f"{API}/admin/orders")
        assert r.status_code in (401, 403)

    def test_customers_no_token(self, s):
        r = s.get(f"{API}/admin/customers")
        assert r.status_code in (401, 403)

    def test_status_update_no_token(self, s):
        r = s.put(f"{API}/admin/orders/000000000000000000000000/status",
                  json={"status": "Confirmed"})
        assert r.status_code in (401, 403)

    def test_customer_token_forbidden(self, s, customer_ctx):
        r = s.get(f"{API}/admin/dashboard", headers=customer_ctx["headers"])
        assert r.status_code == 403


class TestAdminDashboard:
    def test_dashboard_shape(self, s, admin_headers):
        r = s.get(f"{API}/admin/dashboard", headers=admin_headers)
        assert r.status_code == 200
        body = r.json()
        for k in ("revenue", "total_orders", "customers", "average_order_value", "best_sellers", "low_stock"):
            assert k in body, f"Missing key {k} in dashboard"
        assert isinstance(body["best_sellers"], list)
        assert isinstance(body["low_stock"], list)
        assert isinstance(body["revenue"], (int, float))
        assert isinstance(body["total_orders"], int)


class TestAdminOrders:
    def test_orders_list(self, s, admin_headers):
        r = s.get(f"{API}/admin/orders", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_orders_status_filter(self, s, admin_headers):
        r = s.get(f"{API}/admin/orders", headers=admin_headers, params={"status": "Order Placed"})
        assert r.status_code == 200
        for o in r.json():
            assert o["status"] == "Order Placed"


class TestFullE2ELoop:
    """Customer places order -> Admin advances status -> Customer sees updates."""

    def test_full_status_update_loop(self, s, admin_headers, customer_ctx):
        cust = customer_ctx["headers"]
        # 1. Find a product with stock
        r = s.get(f"{API}/products", params={"in_stock": True})
        assert r.status_code == 200
        products = r.json()["products"]
        product = next((p for p in products if p.get("variants") and p["variants"][0].get("stock", 0) > 2), None)
        assert product, "No in-stock product available for test"

        # 2. Customer adds to cart
        s.delete(f"{API}/cart", headers=cust)
        r = s.post(f"{API}/cart/items", headers=cust,
                   json={"product_id": product["id"], "variant_id": product["variants"][0]["id"], "quantity": 1})
        assert r.status_code == 200, r.text

        # 3. Customer places COD order
        r = s.post(f"{API}/checkout", headers=cust,
                   json={"address_id": customer_ctx["address_id"], "payment_method": "cod"})
        assert r.status_code == 200, r.text
        order = r.json()
        order_id = order["id"]
        order_number = order["order_number"]
        assert order["status"] == "Order Placed"
        assert order["payment_status"] == "pending"
        assert len(order["status_history"]) == 1
        assert order["status_history"][0]["status"] == "Order Placed"

        # 4. Admin sees this order in /admin/orders
        r = s.get(f"{API}/admin/orders", headers=admin_headers)
        assert r.status_code == 200
        found = next((o for o in r.json() if o["id"] == order_id), None)
        assert found, f"Order {order_number} not visible in admin/orders"

        # 5. Admin fetches order detail (has status_flow)
        r = s.get(f"{API}/admin/orders/{order_id}", headers=admin_headers)
        assert r.status_code == 200
        detail = r.json()
        assert "status_flow" in detail
        assert detail["status_flow"] == [
            "Order Placed", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered"
        ]

        # 6. Admin advances to Confirmed
        r = s.put(f"{API}/admin/orders/{order_id}/status", headers=admin_headers,
                  json={"status": "Confirmed"})
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["status"] == "Confirmed"
        assert len(updated["status_history"]) >= 2

        # 7. Admin advances to Packed with tracking number
        tracking = "TRACK123XYZ"
        r = s.put(f"{API}/admin/orders/{order_id}/status", headers=admin_headers,
                  json={"status": "Packed", "tracking_number": tracking})
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["status"] == "Packed"
        assert updated.get("tracking_number") == tracking
        assert len(updated["status_history"]) >= 3
        history_statuses = [h["status"] for h in updated["status_history"]]
        assert history_statuses == ["Order Placed", "Confirmed", "Packed"]

        # 8. Customer fetches the order via /api/orders/{id} - reflects Packed + tracking
        r = s.get(f"{API}/orders/{order_id}", headers=cust)
        assert r.status_code == 200, r.text
        cust_view = r.json()
        assert cust_view["status"] == "Packed", f"Customer sees {cust_view['status']} but expected Packed"
        assert cust_view.get("tracking_number") == tracking
        assert len(cust_view["status_history"]) == 3
        assert "status_flow" in cust_view

        # 9. Advance to Delivered -> payment_status = paid
        r = s.put(f"{API}/admin/orders/{order_id}/status", headers=admin_headers,
                  json={"status": "Delivered"})
        assert r.status_code == 200
        final = r.json()
        assert final["status"] == "Delivered"
        assert final["payment_status"] == "paid"

        # 10. Customer reflects Delivered + paid
        r = s.get(f"{API}/orders/{order_id}", headers=cust)
        assert r.status_code == 200
        cv = r.json()
        assert cv["status"] == "Delivered"
        assert cv["payment_status"] == "paid"


class TestAdminCustomers:
    def test_customers_list(self, s, admin_headers):
        r = s.get(f"{API}/admin/customers", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if data:
            c = data[0]
            for k in ("id", "phone", "order_count", "total_spend"):
                assert k in c
