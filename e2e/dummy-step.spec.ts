import { expect, test, type Page } from '@playwright/test'

const next = (page: Page) => page.getByRole('button', { name: 'Tovább', exact: true }).click()
const pick = (page: Page, name: string) =>
  page
    .getByRole('group', { name: 'Játékosok' })
    .getByRole('button', { name: new RegExp(name) })
    .click()

test('a dead role is called as usual without the death in the read-aloud lines', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Új játék' }).click()
  for (const name of ['Anna', 'Bence', 'Csilla', 'Dani']) {
    await page.getByRole('button', { name: 'Játékos hozzáadása' }).click()
    await page.getByPlaceholder('Név').last().fill(name)
  }
  await next(page)
  for (const role of ['Gyilkos', 'Orvos']) {
    await page.getByRole('button', { name: `${role} +1`, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Feltöltés városlakókkal' }).click()
  await next(page)
  await next(page)
  await next(page)
  const rows = await page.getByTestId('assignment').allTextContents()
  const doctor = rows.map((r) => r.match(/^\d+\. (.+) – (.+)$/)!).find((m) => m[2] === 'Orvos')![1]
  await page.getByRole('button', { name: 'Indulhat a játék' }).click()

  await next(page)
  await next(page)
  await pick(page, doctor)
  await next(page)
  await page.getByRole('button', { name: 'Senkit' }).click()
  await next(page)
  await page.getByRole('button', { name: 'Jöhet a reggel' }).click()
  await next(page)
  await next(page)
  await next(page)
  await next(page)
  await page.getByRole('button', { name: 'Jöhet az éjszaka' }).click()
  await next(page)
  await page.getByRole('button', { name: 'Senkit' }).click()
  await next(page)

  await expect(page.getByRole('heading', { name: 'Orvos' })).toBeVisible()
  const readAloud = page.getByText('Mondd:', { exact: true }).locator('..')
  await expect(readAloud.filter({ hasText: 'Felébred az orvos.' })).not.toHaveCount(0)
  await expect(readAloud.filter({ hasText: 'már nem él' })).toHaveCount(0)
  await expect(page.getByText('már nem él')).toBeVisible()
})
