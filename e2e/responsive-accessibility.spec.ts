import { expect, test } from "@playwright/test";

const publicPages = [
  { path: "/", name: "início" },
  { path: "/login", name: "login" },
  { path: "/planos", name: "planos" },
  { path: "/portal-cliente", name: "portal do cliente" },
];

for (const viewport of [
  { label: "celular", width: 390, height: 844 },
  { label: "tablet", width: 768, height: 1024 },
]) {
  test.describe(`${viewport.label}: responsividade e acessibilidade básica`, () => {
    test.use({ viewport });

    for (const target of publicPages) {
      test(`${target.name} não cria rolagem horizontal`, async ({ page }) => {
        await page.goto(target.path);
        await page.waitForLoadState("domcontentloaded");
        const overflow = await page.evaluate(() =>
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
        await expect(page.locator("main, [role='main'], #root").first()).toBeVisible();
      });
    }
  });
}

test("login mantém nome acessível em todos os campos e ações", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel(/e-?mail/i)).toBeVisible();
  await expect(page.getByLabel(/senha/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /esqueceu a senha/i })).toBeVisible();
});
