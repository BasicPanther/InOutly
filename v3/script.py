
# Let me create a comprehensive summary of server endpoints needed
endpoints = {
    "Leaves": [
        "POST /api/leaves - Submit leave request",
        "GET /api/leaves - Get all leaves (admin)",
        "GET /api/employee/leaves?id=EMP001 - Get employee's leaves",
        "PUT /api/leaves/:id - Approve/Reject leave",
    ],
    "Meeting Rooms": [
        "GET /api/meeting-rooms - Get all meeting rooms",
        "POST /api/meetings - Book meeting room",
        "GET /api/meetings - Get all bookings (admin)",
        "GET /api/employee/meetings?id=EMP001 - Get employee's bookings",
        "PUT /api/meetings/:id - Approve/Reject booking",
    ],
    "Employee Stats": [
        "GET /api/employee/stats?id=EMP001 - Get employee stats",
        "GET /api/employee/attendance?id=EMP001&month=2025-11 - Get attendance",
        "GET /api/employee/projects?id=EMP001 - Get assigned projects",
    ],
    "Admin Approvals": [
        "GET /api/admin/approvals - Get all pending approvals",
    ]
}

for category, eps in endpoints.items():
    print(f"\n{category}:")
    for ep in eps:
        print(f"  • {ep}")

print("\n✅ All endpoints summary ready for implementation")
