import { expect, test } from "@playwright/test"

// High-level flows only. Add one test per core journey once built:
//   parent sets up family → adds kid → posts allowance
//   kid signs in → sees garden → runs a what-if
//   kid proposes a chore → parent approves

test("landing page shows the pitch and a working calculator", async ({
  page,
}) => {
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Plant a dollar. Watch it grow." })
  ).toBeVisible()
  await expect(page.getByText("If you save it all")).toBeVisible()
})

test("worker and database are healthy", async ({ request }) => {
  const res = await request.get("/api/health")
  expect(res.ok()).toBe(true)
  expect(await res.json()).toEqual({ ok: true, db: "up" })
})
