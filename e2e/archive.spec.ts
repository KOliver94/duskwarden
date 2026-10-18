import { expect, test, type Page } from '@playwright/test'

const next = (page: Page) => page.getByRole('button', { name: 'Tovább', exact: true }).click()

async function launch(page: Page, pages: number) {
  for (let i = 0; i < pages; i++) await next(page)
  await page.getByRole('button', { name: 'Indulhat a játék' }).click()
  await expect(page.getByText('Leszállt az éj. Mindenki csukja be a szemét!')).toBeVisible()
}

test('opens a finished game from the past games and deletes it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Új játék' }).click()
  for (const name of ['Anna', 'Bence', 'Csilla']) {
    await page.getByRole('button', { name: 'Játékos hozzáadása' }).click()
    await page.getByPlaceholder('Név').last().fill(name)
  }
  await next(page)
  await page.getByRole('button', { name: 'Gyilkos +1', exact: true }).click()
  await page.getByRole('button', { name: 'Feltöltés városlakókkal' }).click()
  await launch(page, 3)

  await page.getByRole('button', { name: 'Menü' }).click()
  await page.getByRole('button', { name: 'Játék befejezése' }).click()
  const endSheet = page.getByRole('dialog', { name: 'Játék befejezése' })
  await endSheet.getByRole('radio', { name: 'A város' }).click()
  await endSheet.getByRole('button', { name: 'Játék befejezése' }).click()
  await expect(page.getByRole('heading', { name: 'A város nyert!' })).toBeVisible()

  await page.getByRole('button', { name: 'Új játék' }).click()
  await launch(page, 4)
  await page.getByRole('button', { name: 'Menü' }).click()
  await page.getByRole('button', { name: 'Kezdőlap' }).click()

  await page.getByRole('button', { name: 'Korábbi játékok' }).click()
  const row = page.getByRole('listitem').filter({ hasText: 'A város nyert!' })
  await expect(row).toContainText('3 játékos')
  await row.getByRole('button').first().click()

  await expect(page.getByRole('heading', { name: 'A város nyert!' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Vissza a játékhoz' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Mesélői napló' }).click()
  await expect(page.getByRole('dialog', { name: 'Mesélői napló' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goBack()

  await row.getByRole('button', { name: 'Törlés' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Törlés' }).click()
  await expect(page.getByText('Még nincs korábbi játék.')).toBeVisible()

  await page.getByRole('button', { name: 'Vissza', exact: true }).click()
  await expect(page.getByRole('button', { name: /Játék folytatása/ })).toBeVisible()
  await page.getByRole('button', { name: 'Korábbi játékok' }).click()
  await expect(page.getByText('Még nincs korábbi játék.')).toBeVisible()
})
