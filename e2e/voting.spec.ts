import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 375, height: 812 } })

test('long nominee names stay readable on a narrow phone', async ({ page }) => {
  const next = () => page.getByRole('button', { name: 'Tovább', exact: true }).click()
  await page.goto('/')
  await page.getByRole('button', { name: 'Új játék' }).click()
  for (const name of ['Kovács Krisztina', 'Kovács Krisztián', 'Szabó Benedek']) {
    await page.getByRole('button', { name: 'Játékos hozzáadása' }).click()
    await page.getByPlaceholder('Név').last().fill(name)
  }
  await next()
  await page.getByRole('button', { name: 'Gyilkos +1', exact: true }).click()
  await page.getByRole('button', { name: 'Feltöltés városlakókkal' }).click()
  await next()
  await next()
  await next()
  await page.getByRole('button', { name: 'Indulhat a játék' }).click()
  await next()
  await next()
  await page.getByRole('button', { name: 'Senkit' }).click()
  await next()
  await page.getByRole('button', { name: 'Jöhet a reggel' }).click()
  await next()
  await next()

  await page.getByRole('button', { name: 'Jelölt hozzáadása' }).click()
  await page
    .getByRole('group', { name: 'Játékosok' })
    .getByRole('button', { name: /Kovács Krisztina/ })
    .click()
  const name = page.getByText('Kovács Krisztina', { exact: true })
  await expect(name).toBeVisible()
  expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
})
